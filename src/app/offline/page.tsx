import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

import { BrandLockup } from "@/components/general/brand-mark";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false },
};

/**
 * Served by the service worker when a navigation fails.
 *
 * It deliberately shows no trade data. A cached trade screen would look
 * authoritative while being out of date, and in a money app a stale "Protected"
 * is worse than an honest "we can't reach the network".
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <BrandLockup className="text-sm" />

      <WifiOff className="mt-8 size-7 text-kumtru-slate-400" aria-hidden="true" />
      <h1 className="mt-4 text-lg font-semibold">You&apos;re offline</h1>
      <p className="mt-2 max-w-[32ch] text-[13px] leading-relaxed text-kumtru-slate-500">
        We won&apos;t show you trade details we can&apos;t confirm are current. Reconnect and this
        will pick up exactly where it left off.
      </p>
    </div>
  );
}
