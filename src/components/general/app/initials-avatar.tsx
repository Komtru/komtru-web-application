import { cn } from "@/lib/utils";

const sizeMap = {
  sm: "size-5 text-[9px]",
  md: "size-[34px] text-xs",
  lg: "size-11 text-[15px]",
  xl: "size-16 text-lg",
} as const;

/** The same scale in pixels, for `next/image`, which needs a number. */
export const AVATAR_PIXELS: Record<keyof typeof sizeMap, number> = {
  sm: 20,
  md: 34,
  lg: 44,
  xl: 64,
};

export type AvatarSize = keyof typeof sizeMap;

const toneMap = {
  info: "bg-kumtru-info-soft text-kumtru-info-on-soft",
  success: "bg-kumtru-success-soft text-kumtru-success-on-soft",
  warning: "bg-kumtru-warning-soft text-kumtru-warning-on-soft",
  neutral: "bg-kumtru-slate-200 text-kumtru-slate-600",
} as const;

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/** Counterparties are identified by initials, never by an uploaded avatar we
 * cannot verify — a profile photo is not evidence of who someone is. */
export function InitialsAvatar({
  name,
  size = "md",
  tone = "info",
  className,
}: {
  name: string;
  size?: keyof typeof sizeMap;
  tone?: keyof typeof toneMap;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-display font-bold",
        sizeMap[size],
        toneMap[tone],
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
