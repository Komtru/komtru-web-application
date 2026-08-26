/**
 * Client-side-only memory of who the user said the counterpart was while
 * drafting a trade — the label from `CounterpartyField`, which since the resolve
 * step landed is a confirmed account's name or the destination an invitation was
 * sent to, rather than free text.
 *
 * `CreateTradePayloadInterface` still has no field for it. That is the point
 * worth understanding: even a counterpart the user has *confirmed against a real
 * account* is not attached to the trade at create time, because the API offers
 * nowhere to put them — its create validator is strict and rejects unknown keys.
 * Binding still happens later and only one way, when someone redeems the Trade
 * Code. So this remains a best-effort label for this browser only: never sent,
 * never seen by the counterpart, and superseded the moment a real participant
 * (with a real `displayName`) appears in `ITrade.participants`, which every
 * caller here should prefer over this hint.
 *
 * TODO(backend): a counterparty on the create-trade payload would make this
 * whole file unnecessary — and would let a confirmed account be bound at draft
 * time instead of being handed a code to redeem. Invitations already have the
 * shape for it (`party_invitations.contextId` names the trade); trades do not
 * read it yet.
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
