"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Copy, MailCheck, ShieldCheck } from "lucide-react";

import { SafetyCallout } from "@/components/general/safety-callout";
import {
  CounterpartyField,
  type Counterparty,
} from "@/components/general/trade/counterparty-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { setCounterpartyHint } from "@/helpers/counterpartyHints";
import { toErrorMessage } from "@/helpers/errors";
import { toMinorUnits } from "@/helpers/numbers";
import { counterpartRole, inviteChannelLabel } from "@/helpers/party";
import { isCapacityExceededError } from "@/helpers/tradeCapacity";
import { useCustomToast } from "@/hooks/useCustomToast";
import { TradeRoleEnum, TradeSubjectTypeEnum } from "@/interfaces/trade";
import { useInviteParty } from "@/services/party.services";
import { useCreateTrade } from "@/services/trade.services";

const INSPECTION_OPTIONS = ["24 Hours", "48 Hours (Recommended)", "72 Hours", "7 Days"];
const DEFAULT_INSPECTION = "48 Hours (Recommended)";

const ROLE_COPY: Record<
  TradeRoleEnum,
  { title: string; counterpartLabel: string; counterpartPlaceholder: string }
> = {
  [TradeRoleEnum.BUYER]: {
    title: "Start a New Protected Trade",
    counterpartLabel: "Seller / Merchant",
    counterpartPlaceholder: "@handle, email or phone",
  },
  [TradeRoleEnum.SELLER]: {
    title: "Create Merchant Trade Agreement",
    counterpartLabel: "Buyer / Customer",
    counterpartPlaceholder: "@handle, email or phone",
  },
};

const SUBTITLE =
  "Draft trade agreement terms and generate a unique Trade Code for independent verification.";

interface FormState {
  role: TradeRoleEnum;
  /** Null until the user has been shown an account and confirmed it, or chosen to invite. */
  counterparty: Counterparty | null;
  title: string;
  specifications: string;
  price: string;
  deliveryTerms: string;
  inspectionPeriod: string;
  cancellationTerms: string;
}

const INITIAL_STATE: FormState = {
  role: TradeRoleEnum.BUYER,
  counterparty: null,
  title: "",
  specifications: "",
  price: "",
  deliveryTerms: "",
  inspectionPeriod: DEFAULT_INSPECTION,
  cancellationTerms: "",
};

/**
 * "Start a New Trade" — one form, a role toggle at the top, not two separate
 * flows. Every field below the toggle is identical regardless of role except
 * the counterparty label; the role only changes the title/subtitle, which side
 * of `CreateTradePayloadInterface.role` gets sent, and — since the counterpart
 * takes the other side — the `intendedRole` on any invitation.
 *
 * Built as a `Dialog` (there is precedent for a full multi-field form living in
 * one — see `add-channel-dialog.tsx`) rather than a pushed route: this is a
 * short, self-contained draft step the user should be able to back out of by
 * tapping outside it, not a destination with its own place in the nav stack.
 *
 * Two requests, strictly in this order. `POST /trades` first, because an
 * invitation has to name the trade it was sent for and the trade's uuid does not
 * exist until it is created; `POST /parties/invite` second, and only when the
 * counterpart has no account. The order is also the failure story: a trade with
 * no invitation is recoverable — the code is on screen and the invitation can be
 * retried — whereas an invitation naming a trade that was never created is not.
 */
export function StartTradeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { showToast } = useCustomToast();
  const createTrade = useCreateTrade();
  const invite = useInviteParty();

  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  /**
   * The trade, once it exists. Both halves are kept: the code is what the user
   * copies, the uuid is what an invitation retry has to name.
   */
  const [created, setCreated] = useState<{ code: string; tradeId: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const copy = ROLE_COPY[form.role];
  const capacityExceeded = isCapacityExceededError(createTrade.error);
  const pendingInvite = form.counterparty?.kind === "invite" ? form.counterparty : null;

  const canSubmit =
    form.counterparty !== null &&
    form.title.trim().length > 0 &&
    Number(form.price) > 0 &&
    form.deliveryTerms.trim().length > 0;

  function resetAndClose() {
    setForm(INITIAL_STATE);
    setCreated(null);
    setCopied(false);
    createTrade.reset();
    invite.reset();
    onOpenChange(false);
  }

  /**
   * Sends the invitation for a trade that already exists.
   *
   * Separate from `handleSubmit` so the success screen can call it again: the
   * trade is created by then, so a failed invitation is a retryable step rather
   * than a reason to have lost the whole draft.
   */
  function sendInvite(tradeId: string, counterparty: Counterparty) {
    if (counterparty.kind !== "invite" || invite.isPending) return;

    invite.mutate({
      channel: counterparty.channel,
      destination: counterparty.destination,
      // The counterpart takes the side this user did not.
      intendedRole: counterpartRole(form.role),
      context: { type: "TRANSACTION", id: tradeId },
    });
  }

  function handleSubmit() {
    if (!canSubmit || createTrade.isPending) return;

    const counterparty = form.counterparty;
    if (!counterparty) return;

    createTrade.mutate(
      {
        role: form.role,
        subject: {
          type: TradeSubjectTypeEnum.PHYSICAL_GOOD,
          title: form.title.trim(),
          description: form.specifications.trim() || undefined,
        },
        amount: toMinorUnits(form.price),
        deliveryTerms: form.deliveryTerms.trim(),
        inspectionPeriod: form.inspectionPeriod,
        cancellationTerms: form.cancellationTerms.trim() || undefined,
      },
      {
        onSuccess: (trade) => {
          // `CreateTradePayloadInterface` still has no counterparty field, so
          // this label remains local to the browser — see `counterpartyHints`.
          setCounterpartyHint(trade.tradeCode, counterparty.label);
          setCreated({ code: trade.tradeCode, tradeId: trade.tradeId });

          if (counterparty.kind === "invite") sendInvite(trade.tradeId, counterparty);
        },
        onError: () => {
          // Rendered inline below the submit button — the capacity nudge or the
          // generic message, depending on `isCapacityExceededError`.
        },
      },
    );
  }

  async function handleCopyCode() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast({ title: "Couldn't copy the code", type: "error" });
    }
  }

  function handleViewTrade() {
    if (!created) return;
    const code = created.code;
    resetAndClose();
    router.push(`/trades/${code}`);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : resetAndClose())}>
      <DialogContent className="max-h-[85vh] gap-4 overflow-y-auto sm:max-w-[440px]">
        {created ? (
          <>
            <DialogHeader>
              <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-kumtru-success-soft">
                <ShieldCheck className="size-5 text-kumtru-success-on-soft" aria-hidden="true" />
              </div>
              <DialogTitle className="text-center">Trade Code Generated</DialogTitle>
              <DialogDescription className="text-center">
                Share this code with {form.counterparty?.label ?? "your counterpart"} so they can
                verify and join the trade.
              </DialogDescription>
            </DialogHeader>

            <button
              type="button"
              onClick={handleCopyCode}
              className="flex items-center justify-between rounded-kumtru-md border border-dashed border-kumtru-blue/40 bg-kumtru-blue-soft px-4 py-3.5"
            >
              <span className="font-mono text-lg font-semibold tracking-wide">{created.code}</span>
              {copied ? (
                <Check className="size-4 text-kumtru-success" aria-hidden="true" />
              ) : (
                <Copy className="size-4 text-kumtru-slate-500" aria-hidden="true" />
              )}
            </button>

            {/* The invitation's own outcome, reported separately from the trade's.
                It is a second request against a trade that already exists, so a
                failure here must not read as "the trade did not happen" — and
                must stay retryable without redrafting anything. */}
            {pendingInvite ? (
              invite.isPending ? (
                <p className="flex items-center gap-2 text-xs text-kumtru-slate-500">
                  <Spinner size="sm" />
                  Sending an invitation to {pendingInvite.label}…
                </p>
              ) : invite.isSuccess ? (
                <p className="flex items-start gap-2 text-xs leading-relaxed text-kumtru-success-on-soft">
                  <MailCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  Invitation sent to {pendingInvite.label} by{" "}
                  {inviteChannelLabel(pendingInvite.channel)}. It is tied to this trade and expires
                  in 14 days. They will still need this code to join.
                </p>
              ) : invite.isError ? (
                <SafetyCallout variant="warning" title="The trade is created, the invitation is not.">
                  {toErrorMessage(
                    invite.error,
                    "We couldn't send that invitation just now.",
                  )}{" "}
                  You can send it again, or simply share the code above.
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={() => sendInvite(created.tradeId, pendingInvite)}
                  >
                    Retry invitation
                  </Button>
                </SafetyCallout>
              ) : null
            ) : null}

            <Button size="xl" className="w-full" onClick={handleViewTrade}>
              View Trade
            </Button>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{copy.title}</DialogTitle>
              <DialogDescription>{SUBTITLE}</DialogDescription>
            </DialogHeader>

            <div
              role="radiogroup"
              aria-label="Your role in this trade"
              className="flex rounded-kumtru-sm bg-secondary p-1"
            >
              {(
                [
                  { role: TradeRoleEnum.BUYER, label: "I am the Buyer" },
                  { role: TradeRoleEnum.SELLER, label: "I am the Merchant / Seller" },
                ] as const
              ).map((option) => (
                <button
                  key={option.role}
                  type="button"
                  role="radio"
                  aria-checked={form.role === option.role}
                  onClick={() => setForm((prev) => ({ ...prev, role: option.role }))}
                  className={
                    "flex-1 rounded-kumtru-sm px-2 py-2 text-[12.5px] font-semibold transition-colors " +
                    (form.role === option.role
                      ? "bg-card text-foreground shadow-xs"
                      : "text-kumtru-slate-500")
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="space-y-3.5">
              <CounterpartyField
                label={copy.counterpartLabel}
                placeholder={copy.counterpartPlaceholder}
                value={form.counterparty}
                onChange={(counterparty) => setForm((prev) => ({ ...prev, counterparty }))}
              />

              <FloatingLabelInput
                label="Item / Service Title"
                required
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              />

              <div>
                <Label className="text-[11px] font-semibold tracking-wide text-kumtru-slate-500 uppercase">
                  Specifications / Condition Notes
                </Label>
                <Textarea
                  rows={2}
                  className="mt-1.5"
                  placeholder="Brand, model, size, colour, condition — whatever the counterpart needs to verify this is the right item."
                  value={form.specifications}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, specifications: event.target.value }))
                  }
                />
              </div>

              <FloatingLabelInput
                label="Agreed Price (₦)"
                required
                type="text"
                inputMode="decimal"
                hint="Enter the naira amount, e.g. 45000 for ₦45,000."
                value={form.price}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    price: event.target.value.replace(/[^\d.]/g, ""),
                  }))
                }
              />

              <FloatingLabelInput
                label="Delivery Terms"
                required
                placeholder=" "
                hint="e.g. Delivery within 3–5 business days to Lagos"
                value={form.deliveryTerms}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, deliveryTerms: event.target.value }))
                }
              />

              <div>
                <Label className="text-[11px] font-semibold tracking-wide text-kumtru-slate-500 uppercase">
                  Inspection Window
                </Label>
                <Select
                  value={form.inspectionPeriod}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, inspectionPeriod: value }))
                  }
                >
                  <SelectTrigger className="mt-1.5 h-12 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INSPECTION_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] font-semibold tracking-wide text-kumtru-slate-500 uppercase">
                  Cancellation / Refund Guarantee
                </Label>
                <Textarea
                  rows={2}
                  className="mt-1.5"
                  placeholder="Full refund if unfulfilled in 5 business days"
                  value={form.cancellationTerms}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, cancellationTerms: event.target.value }))
                  }
                />
              </div>

              <SafetyCallout variant="protected" title="Komtru Protected Guarantee">
                Funds will be protected in the Komtru Escrow Reserve upon checkout and released
                only when delivery is verified.
              </SafetyCallout>

              {createTrade.isError ? (
                capacityExceeded ? (
                  <SafetyCallout variant="warning" title="You're near your selling limit.">
                    This trade is above what your current verification level allows you to move as
                    a seller. Verify further for better terms and higher trade limits.
                  </SafetyCallout>
                ) : (
                  <p className="text-xs text-kumtru-risk">
                    {toErrorMessage(createTrade.error, "We couldn't create that trade. Try again.")}
                  </p>
                )
              ) : null}
            </div>

            <Button
              size="xl"
              className="w-full"
              disabled={!canSubmit || createTrade.isPending}
              onClick={handleSubmit}
            >
              {createTrade.isPending ? (
                <Spinner />
              ) : (
                <>
                  Create Trade & Generate Trade Code
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
