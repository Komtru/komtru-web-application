import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export function SettingsGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mb-3.5 overflow-hidden rounded-kumtru-md border border-border bg-card">
      <h2 className="px-3.5 pt-2.5 pb-1 text-[10px] font-bold tracking-wide text-kumtru-slate-500 uppercase">
        {label}
      </h2>
      {children}
    </section>
  );
}

export function SettingsRow({
  label,
  hint,
  trailing,
}: {
  label: string;
  hint?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-3.5 py-3 first-of-type:border-t-0">
      <div className="min-w-0">
        <p className="text-[12.5px] font-semibold">{label}</p>
        {hint ? <p className="mt-0.5 text-[10.5px] text-kumtru-slate-500">{hint}</p> : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}

export function SettingsChevron() {
  return <ChevronRight className="size-3.5 text-kumtru-slate-400" aria-hidden="true" />;
}

/**
 * A `locked` toggle is on and cannot be turned off — dispute and fraud alerts,
 * for instance. It renders visibly disabled rather than silently ignoring taps,
 * so the constraint is legible instead of feeling broken.
 */
export function SettingsToggle({
  label,
  checked,
  locked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  locked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={locked}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "relative h-5 w-[34px] shrink-0 rounded-full transition-colors",
        checked ? "bg-kumtru-cyan" : "bg-kumtru-slate-300",
        locked && "cursor-not-allowed opacity-60",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 size-4 rounded-full bg-white transition-transform",
          checked && "translate-x-3.5",
        )}
      />
    </button>
  );
}
