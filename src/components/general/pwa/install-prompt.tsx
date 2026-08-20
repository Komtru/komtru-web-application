"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, X } from "lucide-react";

import { BrandMark } from "@/components/general/brand-mark";
import { Button } from "@/components/ui/button";

const DISMISSED_KEY = "kumtru-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Add-to-home-screen banner, shown only when the browser actually offers an
 * install (`beforeinstallprompt`) and the user has not dismissed it before.
 *
 * Installing matters here beyond convenience: an installed app is opened from
 * the home screen rather than from a link, which is the same habit that keeps
 * someone from following a spoofed "your trade" URL.
 */
export function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (window.localStorage.getItem(DISMISSED_KEY) === "1") return;
    // Already installed and running standalone — nothing to offer.
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  const dismiss = useCallback(() => {
    window.localStorage.setItem(DISMISSED_KEY, "1");
    setPromptEvent(null);
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  }, [promptEvent]);

  if (!promptEvent) return null;

  return (
    <div className="mx-4 mb-3 flex items-start gap-3 rounded-kumtru-md bg-kumtru-navy p-3.5 text-white">
      <BrandMark className="mt-0.5 size-5 shrink-0 text-kumtru-cyan" />

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold">Install Kumtru</p>
        <p className="mt-1 text-[11px] leading-relaxed text-kumtru-slate-300">
          Open your trades from your home screen instead of a link someone sent you.
        </p>

        <Button size="sm" variant="trust" onClick={install} className="mt-3">
          <Download className="size-3.5" />
          Add to home screen
        </Button>
      </div>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="shrink-0 rounded-full p-1 hover:bg-white/10"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
