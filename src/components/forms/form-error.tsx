import { CircleX } from "lucide-react";

/** Inline counterpart to the error toast — the same message, in place. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-kumtru-sm bg-kumtru-risk-soft p-3 text-xs leading-relaxed text-kumtru-risk-on-soft"
    >
      <CircleX className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
