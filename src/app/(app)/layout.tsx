"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { SessionBoundary } from "@/components/general/app/session-boundary";
import { Spinner } from "@/components/ui/spinner";
import { fonts } from "@/app/fonts";
import { RealtimeProviders } from "@/realtime/realtime-providers";
import { useAuthStore } from "@/store/auth.store";

/**
 * The session gate, and nothing else.
 *
 * Everything below it — the shell chrome, the socket, the `GET /me` fetch — is
 * mounted only once there is a session to hang it on, so none of it needs its
 * own `if (loggedIn)` check.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);

  // The session lives in localStorage, so this is the earliest honest place to
  // check it. Middleware cannot see it; the API enforces it for real.
  useEffect(() => {
    if (hydrated && !accessToken) router.replace("/auth/login");
  }, [hydrated, accessToken, router]);

  if (!hydrated || !accessToken) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner size="lg" className="text-kumtru-blue" />
      </div>
    );
  }

  return (
    <div className={fonts.body.className}>
      <RealtimeProviders>
        <SessionBoundary>{children}</SessionBoundary>
      </RealtimeProviders>
    </div>
  );
}
