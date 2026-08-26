"use client";

import { useState } from "react";
import { ShieldAlert, Truck, XCircle } from "lucide-react";

import { StickyActionBar } from "@/components/general/app/sticky-action-bar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toErrorMessage } from "@/helpers/errors";
import { isCapacityExceededError } from "@/helpers/tradeCapacity";
import { useCustomToast } from "@/hooks/useCustomToast";
import { AcceptanceStatusEnum, TradeRoleEnum, TradeStatusEnum, type ITrade } from "@/interfaces/trade";
import {
  useAcceptTrade,
  useCancelTrade,
  useConfirmDelivery,
  useFundTrade,
  useRaiseDispute,
  useShipTrade,
} from "@/services/trade.services";

type ActionKey = "accept" | "fund" | "ship" | "confirm" | "dispute" | "cancel";

interface AvailableAction {
  key: ActionKey;
  label: string;
}

/**
 * Which actions make sense right now, for this specific viewer.
 *
 * The fixed `TradeStatusEnum` (DRAFT → OPEN → AGREED → PROTECTED → IN_PROGRESS
 * → FULFILLED → COMPLETED → SETTLED, plus CANCELLED/DISPUTED/EXPIRED/REFUNDED)
 * is a simplified, already-collapsed view of the fuller state machine in the
 * spec doc — it does not spell out which of the eight mutation endpoints fires
 * on which transition. This mapping is this app's own reasonable reading of
 * that: whoever hasn't accepted yet accepts while the trade is DRAFT/OPEN, the
 * buyer funds once AGREED, the seller ships once PROTECTED, the buyer confirms
 * delivery once IN_PROGRESS (starting the inspection window), either party can
 * dispute anywhere funds are at risk (PROTECTED through FULFILLED), and either
 * party can cancel outright anywhere before funding (D3). Reconcile against the
 * backend's actual transition rules once they're confirmed.
 */
function getAvailableActions(trade: ITrade, viewerId: string | undefined): AvailableAction[] {
  const viewer = trade.participants.find((participant) => participant.userId === viewerId);
  if (!viewer) return [];

  const actions: AvailableAction[] = [];
  const preFunding = [TradeStatusEnum.DRAFT, TradeStatusEnum.OPEN, TradeStatusEnum.AGREED];
  const fundsAtRisk = [TradeStatusEnum.PROTECTED, TradeStatusEnum.IN_PROGRESS, TradeStatusEnum.FULFILLED];

  if (
    (trade.status === TradeStatusEnum.DRAFT || trade.status === TradeStatusEnum.OPEN) &&
    viewer.acceptanceStatus === AcceptanceStatusEnum.INVITED
  ) {
    actions.push({ key: "accept", label: "Accept Trade Terms" });
  }

  if (trade.status === TradeStatusEnum.AGREED && viewer.role === TradeRoleEnum.BUYER) {
    actions.push({ key: "fund", label: "Fund Escrow" });
  }

  if (trade.status === TradeStatusEnum.PROTECTED && viewer.role === TradeRoleEnum.SELLER) {
    actions.push({ key: "ship", label: "Mark as Shipped" });
  }

  if (trade.status === TradeStatusEnum.IN_PROGRESS && viewer.role === TradeRoleEnum.BUYER) {
    actions.push({ key: "confirm", label: "Confirm Delivery" });
  }

  if (fundsAtRisk.includes(trade.status)) {
    actions.push({ key: "dispute", label: "Raise a Dispute" });
  }

  if (preFunding.includes(trade.status)) {
    actions.push({ key: "cancel", label: "Cancel Trade" });
  }

  return actions;
}

export function TradeActions({ trade, viewerId }: { trade: ITrade; viewerId: string | undefined }) {
  const { showToast } = useCustomToast();

  const accept = useAcceptTrade();
  const fund = useFundTrade();
  const confirm = useConfirmDelivery();
  const cancel = useCancelTrade();
  const ship = useShipTrade();
  const dispute = useRaiseDispute();

  const [shipOpen, setShipOpen] = useState(false);
  const [courier, setCourier] = useState("");
  const [tracking, setTracking] = useState("");

  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  const actions = getAvailableActions(trade, viewerId);
  if (actions.length === 0) return null;

  const onError = (title: string) => (error: unknown) => {
    if (isCapacityExceededError(error)) {
      showToast({
        title: "Verification level too low for this action",
        description: "Verify further for better terms and higher trade limits.",
        type: "warning",
      });
      return;
    }
    showToast({ title, description: toErrorMessage(error), type: "error" });
  };

  function runSimple(key: ActionKey) {
    const payload = { tradeCode: trade.tradeCode };
    if (key === "accept") {
      accept.mutate(payload, { onError: onError("Couldn't accept this trade") });
    } else if (key === "fund") {
      fund.mutate(payload, { onError: onError("Couldn't fund this trade") });
    } else if (key === "confirm") {
      confirm.mutate(payload, { onError: onError("Couldn't confirm delivery") });
    } else if (key === "cancel") {
      cancel.mutate(payload, { onError: onError("Couldn't cancel this trade") });
    }
  }

  function handleShip() {
    if (!courier.trim() || ship.isPending) return;
    ship.mutate(
      { tradeCode: trade.tradeCode, courier: courier.trim(), tracking: tracking.trim() || undefined },
      {
        onSuccess: () => {
          setShipOpen(false);
          setCourier("");
          setTracking("");
          showToast({ title: "Marked as shipped", type: "success" });
        },
        onError: onError("Couldn't mark this trade as shipped"),
      },
    );
  }

  function handleDispute() {
    if (!disputeReason.trim() || dispute.isPending) return;
    dispute.mutate(
      { tradeCode: trade.tradeCode, reason: disputeReason.trim() },
      {
        onSuccess: () => {
          setDisputeOpen(false);
          setDisputeReason("");
          showToast({ title: "Dispute raised", type: "info" });
        },
        onError: onError("Couldn't raise a dispute"),
      },
    );
  }

  return (
    <>
      <StickyActionBar>
        {actions.map((action) => {
          if (action.key === "ship") {
            return (
              <Button key={action.key} size="xl" className="w-full" onClick={() => setShipOpen(true)}>
                <Truck className="size-4" />
                {action.label}
              </Button>
            );
          }

          if (action.key === "dispute") {
            return (
              <Button
                key={action.key}
                size="xl"
                variant="outline"
                className="w-full border-kumtru-risk/40 text-kumtru-risk"
                onClick={() => setDisputeOpen(true)}
              >
                <ShieldAlert className="size-4" />
                {action.label}
              </Button>
            );
          }

          if (action.key === "cancel") {
            return (
              <Button
                key={action.key}
                size="xl"
                variant="ghost"
                className="w-full text-kumtru-slate-500"
                disabled={cancel.isPending}
                onClick={() => runSimple("cancel")}
              >
                {cancel.isPending ? <Spinner /> : <XCircle className="size-4" />}
                {action.label}
              </Button>
            );
          }

          const isFund = action.key === "fund";
          const isPending =
            (action.key === "accept" && accept.isPending) ||
            (action.key === "fund" && fund.isPending) ||
            (action.key === "confirm" && confirm.isPending);

          return (
            <Button
              key={action.key}
              size="xl"
              variant={isFund ? "trust" : "default"}
              className="w-full"
              disabled={isPending}
              onClick={() => runSimple(action.key)}
            >
              {isPending ? <Spinner /> : action.label}
            </Button>
          );
        })}
      </StickyActionBar>

      <Dialog open={shipOpen} onOpenChange={setShipOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Mark as Shipped</DialogTitle>
            <DialogDescription>
              Tell the buyer who is carrying it, so they can track it to delivery.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5">
            <FloatingLabelInput
              label="Courier"
              required
              value={courier}
              onChange={(event) => setCourier(event.target.value)}
              placeholder=" "
            />
            <FloatingLabelInput
              label="Tracking number (optional)"
              value={tracking}
              onChange={(event) => setTracking(event.target.value)}
              placeholder=" "
            />
          </div>

          <DialogFooter>
            <Button
              size="lg"
              className="w-full"
              disabled={!courier.trim() || ship.isPending}
              onClick={handleShip}
            >
              {ship.isPending ? <Spinner /> : "Confirm Shipment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Raise a Dispute</DialogTitle>
            <DialogDescription>
              This hands the trade to Komtru&apos;s dispute team. Funds stay protected while it&apos;s
              reviewed.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            rows={4}
            placeholder="What went wrong?"
            value={disputeReason}
            onChange={(event) => setDisputeReason(event.target.value)}
          />

          <DialogFooter>
            <Button
              size="lg"
              variant="destructive"
              className="w-full"
              disabled={!disputeReason.trim() || dispute.isPending}
              onClick={handleDispute}
            >
              {dispute.isPending ? <Spinner /> : "Submit Dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
