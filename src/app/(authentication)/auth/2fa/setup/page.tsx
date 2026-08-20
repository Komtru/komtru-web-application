"use client";

import Link from "next/link";
import { ChevronRight, Mail, Smartphone } from "lucide-react";

import { AuthHeading } from "@/components/forms/auth-heading";
import { SafetyCallout } from "@/components/general/safety-callout";

const methods = [
  {
    href: "/auth/2fa/setup/app",
    icon: Smartphone,
    title: "Authenticator app",
    description: "Codes generated on your device. Works offline and can't be intercepted by SMS.",
    recommended: true,
  },
  {
    href: "/auth/2fa/setup/email",
    icon: Mail,
    title: "Email codes",
    description: "We email a 6-digit code each time you sign in from a new device.",
    recommended: false,
  },
];

export default function TwoFactorSetupPage() {
  return (
    <div>
      <AuthHeading
        title="Add a second step"
        description="Two-step verification protects the one action that moves money: releasing a payment."
      />

      <div className="space-y-3">
        {methods.map(({ href, icon: Icon, title, description, recommended }) => (
          <Link
            key={href}
            href={href}
            className="flex items-start gap-3.5 rounded-kumtru-md border border-border bg-card p-4 transition-colors hover:border-kumtru-blue"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-kumtru-sm bg-kumtru-info-soft">
              <Icon className="size-4 text-kumtru-info-on-soft" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold">{title}</span>
                {recommended ? (
                  <span className="rounded-full bg-kumtru-success-soft px-2 py-0.5 text-[10px] font-semibold text-kumtru-success-on-soft">
                    Recommended
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-kumtru-slate-500">
                {description}
              </span>
            </span>
            <ChevronRight
              className="mt-1 size-4 shrink-0 text-kumtru-slate-400"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>

      <SafetyCallout className="mt-6" title="Never read a code out to anyone.">
        Kumtru support will never ask for a verification code, and no counterparty ever needs one.
      </SafetyCallout>
    </div>
  );
}
