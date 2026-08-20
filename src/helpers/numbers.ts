/**
 * Money is stored and transported in minor units (kobo, cents) as integers.
 * Only presentation divides by 100.
 */
export function formatMoney(minorUnits: number, currency = "NGN", locale = "en-NG"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: minorUnits % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(minorUnits / 100);
}

/** Compact display for dashboard tiles: 1.2M, 452K. */
export function formatCompactMoney(minorUnits: number, currency = "NGN", locale = "en-NG"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(minorUnits / 100);
}

export function formatNumber(value: number, locale = "en-NG"): string {
  return new Intl.NumberFormat(locale).format(value);
}

/** 0.964 → "96.4%" */
export function formatPercent(ratio: number, fractionDigits = 1, locale = "en-NG"): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(ratio);
}

/** Naira input (major units, possibly "452,000") → integer kobo. */
export function toMinorUnits(input: string | number): number {
  const numeric = typeof input === "number" ? input : Number(String(input).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
}

export function toMajorUnits(minorUnits: number): number {
  return minorUnits / 100;
}

/** Protection fee, in minor units. Kept here so every surface quotes the same number. */
export const PROTECTION_FEE_RATE = 0.015;

export function protectionFee(amountMinorUnits: number): number {
  return Math.round(amountMinorUnits * PROTECTION_FEE_RATE);
}
