import { DateTime } from "luxon";

export const FALLBACK_TIMEZONE = "Africa/Lagos";

export function resolveDeviceTimeZone(): string {
  if (typeof Intl === "undefined") return FALLBACK_TIMEZONE;
  return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIMEZONE;
}

/** ISO string → "3 Aug 2026, 10:03" in the given zone. */
export function formatInZone(
  iso: string,
  timezone: string = FALLBACK_TIMEZONE,
  format = "d LLL yyyy, HH:mm",
): string {
  const parsed = DateTime.fromISO(iso, { zone: timezone });
  return parsed.isValid ? parsed.toFormat(format) : "—";
}

/** ISO string → "3 hours ago". */
export function relativeFromNow(iso: string, timezone: string = FALLBACK_TIMEZONE): string {
  const parsed = DateTime.fromISO(iso, { zone: timezone });
  return parsed.isValid ? (parsed.toRelative() ?? "—") : "—";
}

/** Hours remaining on an inspection window; negative once it has lapsed. */
export function hoursUntil(iso: string): number {
  const parsed = DateTime.fromISO(iso);
  if (!parsed.isValid) return 0;
  return Math.round(parsed.diffNow("hours").hours);
}
