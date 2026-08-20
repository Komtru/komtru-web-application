import type { RequestError } from "@/interfaces/IAxios";

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

function hasMessage(value: unknown): value is { message: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof (value as { message: unknown }).message === "string"
  );
}

/**
 * The facade rejects with the API error envelope where one exists, and with the
 * raw error otherwise. Both paths end up here so callers never render `undefined`.
 */
export function toErrorMessage(error: unknown, fallback = GENERIC_MESSAGE): string {
  if (typeof error === "string" && error.trim()) return error;
  if (hasMessage(error) && error.message.trim()) return error.message;
  return fallback;
}

/** Field-level validation errors, when the API returns them. */
export function toFieldErrors(error: unknown): Record<string, string> {
  if (typeof error !== "object" || error === null) return {};

  const errors = (error as RequestError).errors;
  if (!errors) return {};

  return Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => [field, messages[0] ?? GENERIC_MESSAGE]),
  );
}
