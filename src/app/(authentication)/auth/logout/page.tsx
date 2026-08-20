"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Spinner } from "@/components/ui/spinner";
import { useCustomToast } from "@/hooks/useCustomToast";
import { getQueryClient } from "@/lib/react-query";
import { useLogout } from "@/services/auth.services";
import { clearPersistedSession, useAuthStore } from "@/store/auth.store";

const REVOKED_MESSAGE = "Your session ended for security reasons. Please sign in again.";
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

    const revoked = code === "access_revoked";

    async function signOut() {
      const refreshToken = useAuthStore.getState().refresh?.token;

      // Best-effort server-side revocation. A failure here (already-revoked
      // token, offline) must never strand the user in a signed-in shell.
      if (refreshToken && !revoked) {
        try {
          await logout({ refreshToken });
        } catch {
          // Intentionally ignored — the local session is cleared regardless.
        }
      }

      clearPersistedSession();
      getQueryClient().clear();

      showToast({
        title: revoked ? "Session ended" : "Signed out",
        description: revoked ? REVOKED_MESSAGE : NORMAL_MESSAGE,
        type: revoked ? "warning" : "info",
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
