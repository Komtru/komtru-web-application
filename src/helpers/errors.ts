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

/**
 * There is no `toFieldErrors` here on purpose.
 *
 * The API returns one human-readable `message` per rejection, never a
 * field-keyed map — its validation layer converts the first Joi failure into a
 * single 400. A helper that pretended to unpack per-field errors would only ever
 * return an empty object.
 */
