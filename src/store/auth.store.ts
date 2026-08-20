import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { IAuthStore } from "@/interfaces/auth";

const STORE_NAME = "kumtru-auth-store";

export const useAuthStore = create<IAuthStore>()(
  persist(
    (set) => ({
      access: undefined,
      refresh: undefined,
      auth: null,
      user: null,
      hydrated: false,

      initUserStore: ({ auth, user, tokens }) =>
        set({
          auth,
          user,
          access: tokens.access,
          refresh: tokens.refresh,
        }),

      setAccess: (tokens) => set({ access: tokens.access, refresh: tokens.refresh }),

      setAccount: ({ auth, user }) =>
        set((state) => ({
          auth: auth ?? state.auth,
          user: user ?? state.user,
        })),

      setHydrated: () => set({ hydrated: true }),

      logoutAccount: () =>
        set({
          access: undefined,
          refresh: undefined,
          auth: null,
          user: null,
        }),
    }),
    {
      name: STORE_NAME,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ access, refresh, auth, user }) => ({
        access,
        refresh,
        auth,
        user,
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
  useAuthStore.getState().logoutAccount();

  if (typeof window === "undefined") return;

  window.localStorage.removeItem(STORE_NAME);
  window.sessionStorage.clear();
}
