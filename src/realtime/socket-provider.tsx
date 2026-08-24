"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";

import type { SocketContextValue } from "@/interfaces/realtime";

/**
 * The socket server is a separate long-lived process, not the Next.js app — so
 * this is a real cross-origin URL, not a same-origin `/api` rewrite like every
 * HTTP call in `services/base.ts`.
 */
const SOCKET_URL = process.env.NEXT_PUBLIC_WS_BASE_URL;

/**
 * The HTTP path the handshake is served on — NOT socket.io's `/socket.io` default.
 *
 * This has to match the server's `SOCKET_PATH` exactly. Mismatch it and there is
 * no useful error: the handshake just 404s and the client retries the same wrong
 * URL with backoff forever, which reads as "the socket server is down".
 */
const SOCKET_PATH = process.env.NEXT_PUBLIC_WS_PATH ?? "/socket";

/**
 * A handshake rejected by the server's auth middleware does not auto-reconnect
 * (socket.io only retries transport-level failures). Retry a bounded number of
 * times, and reset the budget whenever a fresh access token arrives.
 */
const AUTH_RETRY_DELAY_MS = 10_000;
const AUTH_RETRY_LIMIT = 5;

const SocketContext = createContext<SocketContextValue>({ socket: null, connected: false });

/**
 * Owns exactly one connection for the lifetime of the authenticated shell.
 *
 * The `token` prop is the current access token. It is deliberately *not* an
 * effect dependency: tearing the connection down every time the access token
 * refreshes would drop the socket on a timer for no reason. Instead the token
 * is read through a ref by socket.io's function-form `auth`, which is invoked
 * on every connection attempt — so reconnects always present a current
 * credential while a healthy connection is left alone.
 */
export function SocketProvider({ token, children }: { token: string; children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  const tokenRef = useRef(token);
  const socketRef = useRef<Socket | null>(null);
  const authRetriesRef = useRef(0);

  // Declared before the connect effect so the ref is current the first time the
  // handshake reads it.
  useEffect(() => {
    tokenRef.current = token;
    authRetriesRef.current = 0;

    // A new token is the one event that can fix a rejected handshake. `active`
    // is true while socket.io is already retrying on its own; only step in when
    // it has given up.
    const instance = socketRef.current;
    if (instance && !instance.connected && !instance.active) instance.connect();
  }, [token]);

  useEffect(() => {
    if (!SOCKET_URL) {
      console.warn("[realtime] NEXT_PUBLIC_WS_BASE_URL is not set — realtime updates are off.");
      return;
    }

    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const instance = io(SOCKET_URL, {
      path: SOCKET_PATH,
      // Function form: re-evaluated per attempt, so a reconnect after a token
      // refresh presents the new token rather than the one from page load.
      auth: (cb) => cb({ token: tokenRef.current }),
      // WebSocket first, rather than socket.io's default of opening with HTTP
      // long-polling and upgrading afterwards. The default costs a handshake
      // round-trip on every connect, and if the upgrade ever fails to complete
      // the connection silently stays on polling — which is a fresh XHR every
      // few seconds, for the life of the session.
      //
      // `tryAllTransports` keeps the fallback: if the WebSocket cannot open at
      // all, the client works down this list instead of giving up, so a network
      // that blocks WS still gets realtime over polling.
      transports: ["websocket", "polling"],
      tryAllTransports: true,
      // Transport-level drops reconnect with backoff by default.
    });

    const onConnect = () => {
      authRetriesRef.current = 0;
      setConnected(true);
    };

    const onDisconnect = () => setConnected(false);

    const onConnectError = (error: Error) => {
      setConnected(false);
      if (instance.active) return; // socket.io is already retrying.

      if (authRetriesRef.current >= AUTH_RETRY_LIMIT) {
        console.warn("[realtime] handshake rejected; waiting for a new token.", error.message);
        return;
      }

      authRetriesRef.current += 1;
      retryTimer = setTimeout(() => instance.connect(), AUTH_RETRY_DELAY_MS);
    };

    instance.on("connect", onConnect);
    instance.on("disconnect", onDisconnect);
    instance.on("connect_error", onConnectError);

    socketRef.current = instance;
    // Held in state, not read off the ref: consumers must re-render as soon as
    // the instance exists, not only once `connected` first flips — otherwise
    // `useSocketEvent` misses anything delivered in that window.
    setSocket(instance);

    return () => {
      clearTimeout(retryTimer);
      instance.off("connect", onConnect);
      instance.off("disconnect", onDisconnect);
      instance.off("connect_error", onConnectError);
      instance.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
    };
    // Mount-scoped on purpose — see the note on `token` above.
  }, []);

  return <SocketContext.Provider value={{ socket, connected }}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}

/**
 * Subscribe to a socket event for as long as the component is mounted.
 *
 * The handler is held in a ref, so callers do not have to wrap it in
 * `useCallback` to avoid resubscribing on every render.
 */
export function useSocketEvent<T = unknown>(
  eventName: string,
  handler: (payload: T) => void,
): void {
  const { socket } = useSocket();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!socket) return;

    const listener = (payload: T) => handlerRef.current(payload);
    socket.on(eventName, listener);

    return () => {
      socket.off(eventName, listener);
    };
  }, [socket, eventName]);
}

/**
 * Run something after the connection comes back — but not on the first connect.
 *
 * A live event is a hint, never the source of truth: whatever happened while
 * the socket was down was never pushed, so the only correct response to a
 * reconnect is to refetch from the API.
 *
 * This listens on `connect` rather than the manager's `reconnect`, because a
 * handshake retried by hand after an auth rejection (see `SocketProvider`)
 * emits the former and not the latter — and that gap is exactly the one worth
 * resyncing after.
 */
export function useSocketReconnect(handler: () => void): void {
  const { socket } = useSocket();
  const handlerRef = useRef(handler);
  const connectedBeforeRef = useRef(false);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      if (connectedBeforeRef.current) handlerRef.current();
      connectedBeforeRef.current = true;
    };

    // The provider may have connected before this hook mounted.
    if (socket.connected) connectedBeforeRef.current = true;
    socket.on("connect", onConnect);

    return () => {
      socket.off("connect", onConnect);
    };
  }, [socket]);
}
