import { AlertTriangle, Info, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const variants = {
  warning: {
    surface: "bg-kumtru-warning-soft",
    icon: "text-kumtru-warning-on-soft",
    Icon: AlertTriangle,
  },
  risk: {
    surface: "bg-kumtru-risk-soft",
    icon: "text-kumtru-risk-on-soft",
    Icon: AlertTriangle,
  },
  info: {
    surface: "bg-kumtru-info-soft",
    icon: "text-kumtru-info-on-soft",
    Icon: Info,
  },
  protected: {
    surface: "bg-kumtru-success-soft",
    icon: "text-kumtru-success-on-soft",
    Icon: ShieldCheck,
  },
} as const;

/**
 * Standing safety guidance. Kumtru never asks anyone to pay outside a trade,
 * share an OTP, or send money to a personal account — and says so where the
 * risky action would be taken, not buried in a help centre.
 */
export function SafetyCallout({
  variant = "warning",
  title,
  children,
  className,
}: {
  variant?: keyof typeof variants;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const { surface, icon, Icon } = variants[variant];

  return (
    <div className={cn("flex gap-3 rounded-kumtru-md p-3.5", surface, className)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", icon)} aria-hidden="true" />
      <div className="text-xs leading-relaxed text-foreground">
        {title ? <b className="font-semibold">{title} </b> : null}
        {children}
      </div>
    </div>
  );
}
