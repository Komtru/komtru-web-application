import type { RequestError } from "@/interfaces/IAxios";

/**
 * Detects a seller-capacity rejection on `POST /trades` (and `redeem`/`accept`,
 * which can hit the same check once a counterpart binds as seller).
 *
 * TODO: wire to backend's SELLER_CAPACITY_EXCEEDED error shape once confirmed.
 * A backend bot is building this contract in parallel on the same branch name
 * in `backend-apis` and had not finalized the distinguishable error shape at
 * the time this shipped. Until then this checks the handful of places a coded
 * rejection commonly shows up on this API (`data.code`, `data.errorCode`) for
 * a "CAPACITY" token, and otherwise returns `false` — a false negative here
 * just means the caller falls back to the generic error message, never a crash
 * or a dead end.
 */
export function isCapacityExceededError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const envelope = error as Partial<RequestError>;
  const data = envelope.data as Record<string, unknown> | undefined;
  const candidates = [data?.code, data?.errorCode, data?.reason];

  return candidates.some(
    (candidate) => typeof candidate === "string" && candidate.toUpperCase().includes("CAPACITY"),
  );
}
