"use client";

import { useEffect, useState } from "react";

import { FALLBACK_TIMEZONE, resolveDeviceTimeZone } from "@/helpers/timezones";

/**
 * Resolved after mount only — reading the device zone during render would
 * differ between server and client and trip a hydration mismatch.
 */
export function useDeviceTimeZone() {
  const [timezone, setTimezone] = useState<string>(FALLBACK_TIMEZONE);

  useEffect(() => {
    setTimezone(resolveDeviceTimeZone());
  }, []);

  return timezone;
}
