import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { AuthStore, MeResult, SessionResult, SessionTokens } from "@/interfaces/auth";

const STORE_NAME = "kumtru-auth-store";

/**
 * The session, persisted to `localStorage`.
 *
 * The API also sets an HttpOnly refresh cookie, but it is scoped to `/v1/auth`
 * on the API's own origin — this app talks to a same-origin `/api` proxy, so
 * that cookie is never sent back. The refresh token is therefore kept here and
 * passed in the body, which is the mobile-client path the API already supports.
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      accessToken: undefined,
      refreshToken: undefined,
      accessExpiresAt: undefined,
      user: null,
      me: null,
      nextStep: null,
      hydrated: false,

      startSession: ({ accessToken, refreshToken, expiresIn, user, nextStep }: SessionResult) =>
        set({
          accessToken,
          refreshToken,
          accessExpiresAt: Date.now() + expiresIn * 1000,
          user,
          nextStep,
        }),

      // Refresh returns tokens and nothing else, so the user block is left alone
      // rather than being overwritten with undefined.
      setTokens: ({ accessToken, refreshToken, expiresIn }: SessionTokens) =>
        set({ accessToken, refreshToken, accessExpiresAt: Date.now() + expiresIn * 1000 }),

      setUser: (user) => set({ user }),

      /**
       * `GET /me` recomputes `nextStep`, and it is the freshest source of it.
       *
       * It is also the freshest source of every field the session's smaller
       * `user` block duplicates, so all of them are copied across — not just
       * `username` and `status`. Syncing a subset is what let
       * `user.verificationLevel` sit at whatever the session was minted with
       * while `me.verificationLevel` moved on: two fields with one name and
       * different answers, and screens picked the wrong one.
       *
       * `MeResult` is a superset of `UserSummary`, so this is a total mapping
       * rather than a best-effort merge. Add a field to `UserSummary` and it
       * belongs here too.
       */
      setMe: (me: MeResult) =>
        set((state) => ({
          me,
          nextStep: me.nextStep,
          user: state.user
            ? {
                ...state.user,
                userId: me.userId,
                publicId: me.publicId,
                username: me.username,
                status: me.status,
                verificationLevel: me.verificationLevel,
                memberSince: me.memberSince,
              }
            : state.user,
        })),

      setNextStep: (nextStep) => set({ nextStep }),

      setHydrated: () => set({ hydrated: true }),

      logout: () =>
        set({
          accessToken: undefined,
          refreshToken: undefined,
          accessExpiresAt: undefined,
          user: null,
          me: null,
          nextStep: null,
        }),
    }),
    {
      name: STORE_NAME,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ accessToken, refreshToken, accessExpiresAt, user, me, nextStep }) => ({
        accessToken,
        refreshToken,
        accessExpiresAt,
        user,
        me,
        nextStep,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

/**
 * Tokens live in `localStorage`, so nothing auth-dependent may render until the
 * store has rehydrated. Await this in imperative code; gate on `hydrated` in UI.
 */
export function waitForHydration(): Promise<void> {
  if (useAuthStore.getState().hydrated) return Promise.resolve();

  return new Promise((resolve) => {
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.hydrated) {
        unsubscribe();
        resolve();
      }
    });
  });
}

/** Clears the persisted session and every browser storage bucket we own. */
export function clearPersistedSession(): void {
  useAuthStore.getState().logout();

  if (typeof window === "undefined") return;

  window.localStorage.removeItem(STORE_NAME);
  window.sessionStorage.clear();
}
