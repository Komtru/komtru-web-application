import { cn } from "@/lib/utils";

/**
 * The Kumtru mark: three nodes joined by two edges — two parties and the
 * protection sitting between them.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className={cn("size-5", className)}
    >
      <circle cx="6" cy="12" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <circle cx="18" cy="18" r="2.2" />
      <path d="M8 11l8-4M8 13l8 4" />
    </svg>
  );
}

export function BrandLockup({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display font-semibold", className)}>
      <BrandMark className={cn("text-kumtru-cyan", markClassName)} />
      Kumtru
    </span>
  );
}
