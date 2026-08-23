"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  REALTIME_EVENTS,
  type LiveNotification,
  type NotificationContextValue,
  type NotificationPayload,
} from "@/interfaces/realtime";
import { useSocketEvent, useSocketReconnect } from "@/realtime/socket-provider";

/**
 * In-memory only, and capped: this buffer exists so the UI can react without a
 * refetch, not so it can serve as history. History is `GET /notifications`.
 */
const MAX_BUFFERED = 50;

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
  clear: () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useSocketEvent<NotificationPayload>(REALTIME_EVENTS.NOTIFICATION, (payload) => {
    const entry: LiveNotification = {
      id: payload?.id ?? crypto.randomUUID(),
      receivedAt: Date.now(),
      payload: payload ?? {},
    };

    setNotifications((previous) => {
      // A reconnect can replay a frame the tab already holds; keying on the
      // backend id keeps the badge honest.
      if (previous.some((item) => item.id === entry.id)) return previous;
      return [entry, ...previous].slice(0, MAX_BUFFERED);
    });

    setUnreadCount((count) => count + 1);
  });

  // Nothing was pushed while the socket was down, so anything on screen may be
  // stale. Broad on purpose: when the Notifications module ships its own query
  // keys, narrow this to those plus the trade keys.
  useSocketReconnect(() => {
    void queryClient.invalidateQueries({ refetchType: "active" });
  });

  const markAllRead = useCallback(() => setUnreadCount(0), []);

  const clear = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead, clear }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  return useContext(NotificationContext);
}
