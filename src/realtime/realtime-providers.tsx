"use client";

import type { ReactNode } from "react";

import { NotificationProvider } from "@/realtime/notification-provider";
import { SocketProvider } from "@/realtime/socket-provider";
import { TradeSync } from "@/realtime/trade-sync";
import { useAuthStore } from "@/store/auth.store";

/**
 * The realtime entry point, mounted once by the signed-in shell.
 *
 * The credential is the app's own access token, read from the auth store — not
 * a separately minted socket token. This app has no server-side session to mint
 * one from: tokens live in `localStorage` (see `store/auth.store.ts`), every
 * layout in the signed-in shell is a Client Component, and `middleware.ts` is a
 * deliberate pass-through. The backend must therefore verify the handshake
 * token with the same secret it uses for `Authorization: Bearer`.
 *
 * Rendered only where a session already exists, so there is no `if (loggedIn)`
 * check here: `(app)/layout.tsx` holds back the whole subtree until
 * `hydrated && accessToken`, which means a logged-out visitor never reaches
 * this component and no connection is ever attempted.
 */
export function RealtimeProviders({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.accessToken);

  if (!token) return <>{children}</>;

  return (
    <SocketProvider token={token}>
      <NotificationProvider>
        {/* Cache sync, not UI: it holds the `trade.updated` subscription for the life of the shell. */}
        <TradeSync>{children}</TradeSync>
      </NotificationProvider>
    </SocketProvider>
  );
}

export { useSocket, useSocketEvent, useSocketReconnect } from "@/realtime/socket-provider";
export { useNotifications } from "@/realtime/notification-provider";
export { TradeSync } from "@/realtime/trade-sync";
