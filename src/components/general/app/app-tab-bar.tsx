"use client";

import { BottomTabBar } from "@/components/general/app/bottom-tab-bar";
import { useNotifications } from "@/realtime/realtime-providers";

/**
 * `BottomTabBar` with the live counts wired in.
 *
 * Kept separate so the bar itself stays a dumb presentational component that a
 * story or a logged-out preview can render without a socket in scope. Must be
 * rendered inside `RealtimeProviders`.
 *
 * The socket is the only counter with a producer today. `needsAction` — the red
 * dot on My Trades — is left at its default until the Trades module exposes a
 * count of trades waiting on this user; a dot that is always dark is better than
 * one wired to the wrong number.
 */
export function AppTabBar() {
  const { unreadCount } = useNotifications();

  return <BottomTabBar unread={unreadCount} />;
}
