"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, MessageCircleMore, Plus } from "lucide-react";

import { StartTradeDialog } from "@/components/general/trade/start-trade-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { formatMoney } from "@/helpers/numbers";
import { toErrorMessage } from "@/helpers/errors";
import { useCustomToast } from "@/hooks/useCustomToast";
import { useRedeemTrade, useTradeByCode } from "@/services/trade.services";

/**
 * The Trades tab's entry point — "Buy Safely from Any Seller". Two ways in to a
 * trade (enter a code you were given, or start one and generate a code to
 * share) plus a lower-priority third (ask the seller to send you theirs), all
 * above the trade list. Matches the product owner's screenshots exactly; where
 * the older spec doc is vaguer than this, this wins.
 */
export function TradeEntryWidget() {
  const router = useRouter();
  const { showToast } = useCustomToast();

  const [codeInput, setCodeInput] = useState("");
  const [lookupCode, setLookupCode] = useState<string | undefined>(undefined);
  const [startDialogOpen, setStartDialogOpen] = useState(false);

  const lookup = useTradeByCode(lookupCode);
  const redeem = useRedeemTrade();

  function handleVerify() {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setLookupCode(code);
  }

  function handleJoin() {
    if (!lookupCode) return;
    redeem.mutate(
      { tradeCode: lookupCode },
      {
        onSuccess: (trade) => {
          showToast({ title: "Trade joined", type: "success" });
          router.push(`/trades/${trade.tradeCode}`);
        },
        onError: (error) => {
          showToast({
            title: "Couldn't join that trade",
            description: toErrorMessage(error),
            type: "error",
          });
        },
      },
    );
  }

  /**
   * TODO(M11 / messaging): there is no in-app messaging or share-to-seller
   * surface yet. Until one exists, this uses the platform Web Share sheet
   * where available (letting the buyer forward a short prompt through
   * whatever app they were already talking to the seller in) and otherwise
   * falls back to copying the same text to the clipboard.
   */
  async function handleAskSellerForCode() {
    const shareText =
      "Hey — can you send me the Komtru Trade Code for this order? I'll use it to pay you safely through Komtru Escrow.";

    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch {
        // User cancelled the share sheet, or it wasn't actually usable — fall through to clipboard.
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      showToast({
        title: "Message copied",
        description: "Paste it to your seller on Instagram, WhatsApp or Twitter.",
        type: "info",
      });
    } catch {
      showToast({
        title: "Ask your seller for their Trade Code",
        description: "Coming soon: send this directly from Komtru.",
        type: "info",
      });
    }
  }

  return (
    <div className="rounded-kumtru-md border border-border bg-card p-4">
      <h2 className="text-base font-semibold">Buy Safely from Any Seller</h2>
      <p className="mt-1 text-[12.5px] leading-relaxed text-kumtru-slate-500">
        Transact with confidence on Instagram, WhatsApp, or Twitter. Lock your funds until you
        receive and approve your order.
      </p>

      <div className="mt-4 space-y-2.5">
        <div>
          <label
            htmlFor="trade-code-entry"
            className="text-[11px] font-semibold tracking-wide text-kumtru-slate-500 uppercase"
          >
            Enter Trade Code
          </label>
          <div className="mt-1.5 flex gap-2">
            <Input
              id="trade-code-entry"
              value={codeInput}
              onChange={(event) => {
                setCodeInput(event.target.value);
                if (lookupCode) setLookupCode(undefined);
              }}
              placeholder="e.g. KMT-92831"
              className="h-11 flex-1 font-mono uppercase"
              autoCapitalize="characters"
            />
            <Button
              size="lg"
              className="h-11 shrink-0"
              disabled={!codeInput.trim() || lookup.isFetching}
              onClick={handleVerify}
            >
              {lookup.isFetching ? <Spinner /> : "Verify Trade"}
              {!lookup.isFetching ? <ArrowRight className="size-4" /> : null}
            </Button>
          </div>

          {lookupCode && lookup.isError ? (
            <p className="mt-2 text-xs text-kumtru-risk">
              {toErrorMessage(lookup.error, "We couldn't find a trade with that code.")}
            </p>
          ) : null}

          {lookupCode && lookup.data ? (
            <div className="mt-2.5 rounded-kumtru-sm border border-kumtru-blue/25 bg-kumtru-blue-soft p-3">
              <p className="text-[13px] font-semibold">{lookup.data.subject.title}</p>
              <p className="mt-0.5 text-xs text-kumtru-slate-600">
                {formatMoney(lookup.data.financials.amount, lookup.data.financials.currency)} ·{" "}
                <span className="font-mono">{lookup.data.tradeCode}</span>
              </p>
              <Button
                size="sm"
                className="mt-2.5 w-full"
                disabled={redeem.isPending}
                onClick={handleJoin}
              >
                {redeem.isPending ? <Spinner /> : "Join This Trade"}
              </Button>
            </div>
          ) : null}
        </div>

        <Button
          variant="brand"
          size="lg"
          className="w-full"
          onClick={() => setStartDialogOpen(true)}
        >
          <Plus className="size-4" />
          Start a New Trade
        </Button>

        <Button variant="outline" size="lg" className="w-full" onClick={handleAskSellerForCode}>
          <MessageCircleMore className="size-4" />
          Ask Seller for Code
        </Button>
      </div>

      <StartTradeDialog open={startDialogOpen} onOpenChange={setStartDialogOpen} />
    </div>
  );
}
