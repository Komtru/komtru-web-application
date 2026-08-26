"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Copy, ShieldCheck } from "lucide-react";

import { SafetyCallout } from "@/components/general/safety-callout";
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
import { isCapacityExceededError } from "@/helpers/tradeCapacity";
import { useCustomToast } from "@/hooks/useCustomToast";
import { TradeRoleEnum, TradeSubjectTypeEnum } from "@/interfaces/trade";
import { useCreateTrade } from "@/services/trade.services";

const INSPECTION_OPTIONS = ["24 Hours", "48 Hours (Recommended)", "72 Hours", "7 Days"];
const DEFAULT_INSPECTION = "48 Hours (Recommended)";

const ROLE_COPY: Record<
  TradeRoleEnum,
  { title: string; counterpartLabel: string; counterpartPlaceholder: string }
> = {
  [TradeRoleEnum.BUYER]: {
    title: "Start a New Protected Trade",
    counterpartLabel: "Seller / Merchant Name",
    counterpartPlaceholder: "e.g. @lagos_gadgets_store",
  },
  [TradeRoleEnum.SELLER]: {
    title: "Create Merchant Trade Agreement",
    counterpartLabel: "Buyer / Customer Name",
    counterpartPlaceholder: "e.g. @chidinma_a",
  },
};

const SUBTITLE =
  "Draft trade agreement terms and generate a unique Trade Code for independent verification.";

interface FormState {
  role: TradeRoleEnum;
  counterpartyName: string;
  title: string;
  specifications: string;
  price: string;
  deliveryTerms: string;
  inspectionPeriod: string;
  cancellationTerms: string;
}

const INITIAL_STATE: FormState = {
  role: TradeRoleEnum.BUYER,
  counterpartyName: "",
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
 * the counterparty-name label; the role only changes the title/subtitle and
 * which side of `CreateTradePayloadInterface.role` gets sent.
 *
 * Built as a `Dialog` (there is precedent for a full multi-field form living in
 * one — see `add-channel-dialog.tsx`) rather than a pushed route: this is a
 * short, self-contained draft step the user should be able to back out of by
 * tapping outside it, not a destination with its own place in the nav stack.
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

  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copy = ROLE_COPY[form.role];
  const capacityExceeded = isCapacityExceededError(createTrade.error);

  const canSubmit =
    form.counterpartyName.trim().length > 0 &&
    form.title.trim().length > 0 &&
    Number(form.price) > 0 &&
    form.deliveryTerms.trim().length > 0;

  function resetAndClose() {
    setForm(INITIAL_STATE);
    setCreatedCode(null);
    setCopied(false);
    createTrade.reset();
    onOpenChange(false);
  }

  function handleSubmit() {
    if (!canSubmit || createTrade.isPending) return;

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
          setCounterpartyHint(trade.tradeCode, form.counterpartyName);
          setCreatedCode(trade.tradeCode);
        },
        onError: () => {
          // Rendered inline below the submit button — the capacity nudge or the
          // generic message, depending on `isCapacityExceededError`.
        },
      },
    );
  }

  async function handleCopyCode() {
    if (!createdCode) return;
    try {
      await navigator.clipboard.writeText(createdCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast({ title: "Couldn't copy the code", type: "error" });
    }
  }

  function handleViewTrade() {
    if (!createdCode) return;
    const code = createdCode;
    resetAndClose();
    router.push(`/trades/${code}`);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : resetAndClose())}>
      <DialogContent className="max-h-[85vh] gap-4 overflow-y-auto sm:max-w-[440px]">
        {createdCode ? (
          <>
            <DialogHeader>
              <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-kumtru-success-soft">
                <ShieldCheck className="size-5 text-kumtru-success-on-soft" aria-hidden="true" />
              </div>
              <DialogTitle className="text-center">Trade Code Generated</DialogTitle>
              <DialogDescription className="text-center">
                Share this code with {form.counterpartyName || "your counterpart"} so they can
                verify and join the trade.
              </DialogDescription>
            </DialogHeader>

            <button
              type="button"
              onClick={handleCopyCode}
              className="flex items-center justify-between rounded-kumtru-md border border-dashed border-kumtru-blue/40 bg-kumtru-blue-soft px-4 py-3.5"
            >
              <span className="font-mono text-lg font-semibold tracking-wide">{createdCode}</span>
              {copied ? (
                <Check className="size-4 text-kumtru-success" aria-hidden="true" />
              ) : (
                <Copy className="size-4 text-kumtru-slate-500" aria-hidden="true" />
              )}
            </button>

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
              <FloatingLabelInput
                label={copy.counterpartLabel}
                required
                value={form.counterpartyName}
                placeholder=" "
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, counterpartyName: event.target.value }))
                }
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
