"use client";

import { useEffect, type ReactNode } from "react";

import { AppShell } from "@/components/general/app/app-shell";
import { UsernameGate } from "@/components/general/app/username-gate";
import { useMe } from "@/services/auth.services";
import { useAuthStore } from "@/store/auth.store";

/**
 * Keeps the store's copy of the user in step with the API.
 *
 * The session response carries a deliberately small user block; `GET /me` is the
 * full one, and it recomputes `nextStep`. Fetched once here rather than in each
 * screen that wants a name — and above the gate below, so a stale persisted
 * `nextStep` is corrected by the server rather than trusted.
 */
function useSyncMe() {
  const { data } = useMe();
  const setMe = useAuthStore((state) => state.setMe);

  useEffect(() => {
    if (data) setMe(data);
  }, [data, setMe]);
}

/**
 * What a signed-in user gets: the app, or the one thing standing in front of it.
 *
 * `nextStep` is read from the store rather than straight off the `useMe` result
 * so both sources feed it — login and OTP verification set it from their own
 * response, which means the gate is up on the first paint after signup instead
 * of flashing the shell while `GET /me` is still in flight.
 *
 * Only `CHOOSE_USERNAME` gates. `ADD_SECOND_CHANNEL` and `SET_PASSWORD` are the
 * other two values, and the API is explicit that neither blocks: a user with one
 * verified channel can browse and buy. Those surface as a drawer prompt.
 */
export function SessionBoundary({ children }: { children: ReactNode }) {
  useSyncMe();

  const nextStep = useAuthStore((state) => state.nextStep);

  if (nextStep === "CHOOSE_USERNAME") return <UsernameGate />;

  return <AppShell>{children}</AppShell>;
}
