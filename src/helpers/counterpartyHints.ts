/**
 * Client-side-only memory of the counterpart name a user typed while drafting a
 * trade ("Seller / Merchant Name" or "Buyer / Customer Name" on the Start a New
 * Trade form).
 *
 * `CreateTradePayloadInterface` has no field for this — the real account
 * binding happens later, when the counterpart redeems the Trade Code, not at
 * draft time — so there is nothing for the backend to persist yet. This is a
 * best-effort label for this browser only: it is never sent to the API, never
 * seen by the counterpart, and is superseded the moment a real participant
 * (with a real `displayName`) appears in `ITrade.participants`, which every
 * caller here should prefer over this hint.
 *
 * TODO(product): if this name should survive a reinstall, or the counterpart
 * should see it before they redeem, that needs a real backend field on the
 * create-trade payload — flagged as an open item, not decided unilaterally
 * here.
 */
const STORAGE_PREFIX = "kumtru:trade-counterparty-hint:";

export function setCounterpartyHint(tradeCode: string, name: string): void {
  const trimmed = name.trim();
  if (!trimmed || typeof window === "undefined") return;

  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${tradeCode}`, trimmed);
  } catch {
    // Best-effort only — private browsing / storage-blocked contexts just lose the hint.
  }
}

export function getCounterpartyHint(tradeCode: string): string | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    return window.localStorage.getItem(`${STORAGE_PREFIX}${tradeCode}`) ?? undefined;
  } catch {
    return undefined;
  }
}
