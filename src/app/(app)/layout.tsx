"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { BottomTabBar } from "@/components/general/app/bottom-tab-bar";
import { InstallPrompt } from "@/components/general/pwa/install-prompt";
import { Spinner } from "@/components/ui/spinner";
import { fonts } from "@/app/fonts";
import { useAuthStore } from "@/store/auth.store";

/**
 * The signed-in customer shell.
 *
 * Mobile-first in the literal sense: the layout is designed at phone width and
 * simply centred in a column on larger screens, rather than growing a sidebar it
 * would never have on the device most customers actually use.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hydrated = useAuthStore((state) => state.hydrated);
  const access = useAuthStore((state) => state.access);

  // The session lives in localStorage, so this is the earliest honest place to
  // check it. Middleware cannot see it; the API enforces it for real.
  useEffect(() => {
    if (hydrated && !access) router.replace("/auth/login");
  }, [hydrated, access, router]);

  if (!hydrated || !access) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner size="lg" className="text-kumtru-blue" />
      </div>
    );
  }

  return (
    <div className={`${fonts.body.className} bg-kumtru-slate-100 dark:bg-kumtru-navy-deep`}>
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col border-border bg-background sm:border-x">
        <main className="flex flex-1 flex-col">{children}</main>
        <InstallPrompt />
        <BottomTabBar />
      </div>
    </div>
  );
}
