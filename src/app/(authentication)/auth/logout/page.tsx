"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Spinner } from "@/components/ui/spinner";
import { clearMfaChallenge } from "@/helpers/auth";
import { useCustomToast } from "@/hooks/useCustomToast";
import { getQueryClient } from "@/lib/react-query";
import { useLogout } from "@/services/auth.services";
import { clearPersistedSession, useAuthStore } from "@/store/auth.store";

const ENDED_MESSAGE = "Your session ended. Please sign in again.";
const NORMAL_MESSAGE = "You're signed out.";

function Logout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const { showToast } = useCustomToast();
  const { mutateAsync: logout } = useLogout();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    // The facade sends us here when a refresh has already failed. Calling
    // `/auth/logout` with a token the API has just rejected would only 401 again.
    const sessionAlreadyOver = code === "session_ended";

    async function signOut() {
      const refreshToken = useAuthStore.getState().refreshToken;

      // Best-effort server-side revocation. A failure here (already-revoked
      // token, offline) must never strand the user in a signed-in shell.
      if (!sessionAlreadyOver) {
        try {
          await logout({ refreshToken, allDevices: false });
        } catch {
          // Intentionally ignored — the local session is cleared regardless.
        }
      }

      clearPersistedSession();
      clearMfaChallenge();
      getQueryClient().clear();

      showToast({
        title: sessionAlreadyOver ? "Session ended" : "Signed out",
        description: sessionAlreadyOver ? ENDED_MESSAGE : NORMAL_MESSAGE,
        type: sessionAlreadyOver ? "warning" : "info",
      });

      router.replace("/auth/login");
    }

    void signOut();
  }, [code, logout, router, showToast]);

  return (
    <div className="py-12 text-center">
      <Spinner size="lg" className="mx-auto text-kumtru-blue" />
      <p className="mt-4 text-sm text-kumtru-slate-500">Signing you out…</p>
    </div>
  );
}

export default function LogoutPage() {
  return (
    <Suspense fallback={<Spinner size="lg" className="mx-auto text-kumtru-blue" />}>
      <Logout />
    </Suspense>
  );
}
