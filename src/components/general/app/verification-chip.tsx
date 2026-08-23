import type { VerificationLevel } from "@/interfaces/auth";
import { cn } from "@/lib/utils";

/**
 * How far the account has been verified.
 *
 * Distinct from `TrustStatusChip`, which reports the state of a *trade*. Reusing
 * that one here would put a trade vocabulary on an account fact — and the two
 * scales move for entirely different reasons.
 */
const LEVELS: Record<VerificationLevel, { label: string; className: string }> = {
  UNVERIFIED: {
    label: "Unverified",
    className: "bg-kumtru-neutral-soft text-kumtru-neutral-on-soft",
  },
  CONTACT_VERIFIED: {
    label: "Contact verified",
    className: "bg-kumtru-info-soft text-kumtru-info-on-soft",
  },
  IDENTITY_VERIFIED: {
    label: "Identity verified",
    className: "bg-kumtru-success-soft text-kumtru-success-on-soft",
  },
  BUSINESS_VERIFIED: {
    label: "Business verified",
    className: "bg-kumtru-success-soft text-kumtru-success-on-soft",
  },
  ENHANCED: {
    label: "Enhanced",
    className: "bg-kumtru-success-soft text-kumtru-success-on-soft",
  },
};

export function VerificationChip({
  level,
  className,
}: {
  level: VerificationLevel;
  className?: string;
}) {
  const presentation = LEVELS[level] ?? LEVELS.UNVERIFIED;

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        presentation.className,
        className,
      )}
    >
      <i aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {presentation.label}
    </span>
  );
}
