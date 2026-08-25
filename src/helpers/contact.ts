import type {
  ContactChannel,
  ContactChannelRow,
  EmailChannelRow,
  PhoneChannelRow,
  StepUpAction,
  StepUpMethod,
} from "@/interfaces/auth";

/**
 * How long the resend button stays locked, per channel.
 *
 * Different because the wait is different: a WhatsApp message or an SMS can take
 * most of a minute to land, an email lands in seconds — and a "Resend" offered
 * before the first code arrives is what produces three sends for one attempt.
 * The API allows exactly 3 sends per destination per 10 minutes and answers the
 * fourth with a 429, so the lock is spending a scarce budget, not being polite.
 */
export const RESEND_LOCK_SECONDS: Record<ContactChannel, number> = {
  PHONE: 45,
  EMAIL: 30,
};

/**
 * Which channel `ADD_SECOND_CHANNEL` is actually asking for.
 *
 * Mirrors how the API computes that step — it looks for a VERIFIED row on each
 * side, not merely a row. An unverified phone from an abandoned attempt still
 * means the account has no phone, and prompting for one again is correct: adding
 * the same number back returns the existing row and sends a fresh code.
 */
export function missingChannel(
  emails: EmailChannelRow[],
  phones: PhoneChannelRow[],
): ContactChannel | null {
  const hasEmail = emails.some((row) => row.verified);
  const hasPhone = phones.some((row) => row.verified);

  if (hasEmail && hasPhone) return null;
  if (hasEmail) return "PHONE";
  if (hasPhone) return "EMAIL";

  // Neither verified is not a state a live session can be in — activation
  // requires one — so this is a safety net rather than a real branch.
  return "EMAIL";
}

/** The row this flow created, once the list has been refetched. */
export function findRow<T extends ContactChannelRow>(rows: T[], id: string | null): T | undefined {
  return id ? rows.find((row) => row.id === id) : undefined;
}

/** The channel the account currently sends security notices to. */
export function findPrimary<T extends ContactChannelRow>(rows: T[]): T | undefined {
  return rows.find((row) => row.isPrimary && row.verified);
}

export function destinationOf(row: ContactChannelRow): string {
  return "email" in row ? row.email : row.phone;
}

/**
 * Promoting a channel to primary is a step-up action, and the proof is sent to
 * the channel of the same kind — `SMS_OTP` for a phone, `EMAIL_OTP` for an
 * address.
 */
export const STEP_UP_FOR: Record<ContactChannel, { action: StepUpAction; method: StepUpMethod }> = {
  EMAIL: { action: "EMAIL_CHANGE", method: "EMAIL_OTP" },
  PHONE: { action: "PHONE_CHANGE", method: "SMS_OTP" },
};

/**
 * Local format checks only — enough to stop input that cannot possibly be valid
 * from becoming a request. The API normalises and decides, and its answer wins:
 * it is the side that knows which country codes it can reach.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s-]{7,20}$/;

export function checkDestination(channel: ContactChannel, raw: string): string | null {
  const value = raw.trim();

  if (!value) {
    return channel === "EMAIL" ? "Enter an email address." : "Enter a phone number.";
  }

  if (channel === "EMAIL" && !EMAIL_PATTERN.test(value)) {
    return "Enter a valid email address.";
  }

  if (channel === "PHONE" && !PHONE_PATTERN.test(value)) {
    return "Enter a valid phone number, with country code.";
  }

  return null;
}

/** Six digits, matching `OTP_DIGITS` on the API. */
export function checkCode(raw: string): string | null {
  return /^\d{6}$/.test(raw.trim()) ? null : "A code is six digits.";
}
