"use client";

import { useState } from "react";
import { FileCheck, ShieldAlert, Truck, XCircle } from "lucide-react";

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
import { formatMoney } from "@/helpers/numbers";
import { isCapacityExceededError } from "@/helpers/tradeCapacity";
import { useCustomToast } from "@/hooks/useCustomToast";
import { TradeRoleEnum, TradeStatusEnum, type ITrade } from "@/interfaces/trade";
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
 * Now reconciled against the backend's own guard table rather than inferred:
 * `accept` OPEN→AGREED, `fund` AGREED→PROTECTED, `ship` PROTECTED→IN_PROGRESS,
 * `confirm` IN_PROGRESS→SETTLED, `dispute` from PROTECTED/IN_PROGRESS/FULFILLED,
 * `cancel` from DRAFT/OPEN/AGREED — never past funding (D3). Every transition is
 * validated server-side; this only decides what to offer, and offering the wrong
 * thing produces a 409 rather than a bad state.
 *
 * `DRAFT` appears only in the cancel set. No endpoint creates a trade in it —
 * `POST /trades` goes straight to OPEN — so it is accounted for, not expected.
 */
function getAvailableActions(trade: ITrade, viewerId: string | undefined): AvailableAction[] {
  const viewer = trade.participants.find((participant) => participant.userId === viewerId);
  if (!viewer) return [];

  const actions: AvailableAction[] = [];
  const preFunding = [TradeStatusEnum.DRAFT, TradeStatusEnum.OPEN, TradeStatusEnum.AGREED];
  const fundsAtRisk = [TradeStatusEnum.PROTECTED, TradeStatusEnum.IN_PROGRESS, TradeStatusEnum.FULFILLED];

  /**
   * Accepting the agreement is a two-sided handshake recorded on
   * `agreement.acceptedBy`: each party accepts once, and the *second* acceptance
   * is what moves OPEN → AGREED.
   *
   * It has nothing to do with `participant.acceptanceStatus`, which this gate
   * used to read. That field means "is this person on the trade", it is written
   * as `accepted` by both create and redeem, and no code path ever sets
   * `invited` — so the old condition was unsatisfiable and this button never
   * rendered at all. Two distinct meanings, one word.
   *
   * Both parties must be present: accepting alone is a 409 ("Waiting for a
   * counterparty to redeem this trade first").
   */
  if (
    trade.status === TradeStatusEnum.OPEN &&
    trade.participants.length >= 2 &&
    !trade.agreement.acceptedBy.includes(viewer.userId)
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

  const [acceptOpen, setAcceptOpen] = useState(false);

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

  /** The actions that commit on one tap. `accept`, `ship` and `dispute` each confirm first. */
  function runSimple(key: ActionKey) {
    const payload = { tradeCode: trade.tradeCode };
    if (key === "fund") {
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

          if (action.key === "accept") {
            return (
              <Button
                key={action.key}
                size="xl"
                className="w-full"
                onClick={() => setAcceptOpen(true)}
              >
                <FileCheck className="size-4" />
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

      {/* Accepting is the moment these terms start governing the trade, and the
          second acceptance moves it to AGREED — so it gets a confirmation step
          rather than firing on one tap on a scrolling page. The terms themselves
          are restated here: the card on the page behind this dialog is what the
          user is agreeing to, and it should not have to be remembered. */}
      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Accept these terms?</DialogTitle>
            <DialogDescription>
              Once both sides accept, these terms govern the trade and the buyer can fund the
              escrow.
            </DialogDescription>
          </DialogHeader>

          <dl className="space-y-2 rounded-kumtru-md bg-secondary p-3 text-xs">
            <TermRow label="Item" value={trade.subject.title} />
            <TermRow
              label="Amount"
              value={formatMoney(trade.financials.amount, trade.financials.currency)}
            />
            <TermRow label="Delivery" value={trade.agreement.deliveryTerms} />
            {trade.agreement.inspectionPeriod ? (
              <TermRow label="Inspection" value={trade.agreement.inspectionPeriod} />
            ) : null}
            {trade.agreement.cancellationTerms ? (
              <TermRow label="Cancellation" value={trade.agreement.cancellationTerms} />
            ) : null}
          </dl>

          <DialogFooter>
            <Button
              size="xl"
              className="w-full"
              disabled={accept.isPending}
              onClick={() => {
                accept.mutate(
                  { tradeCode: trade.tradeCode },
                  {
                    onSuccess: (updated) => {
                      setAcceptOpen(false);
                      showToast({
                        title:
                          updated.status === TradeStatusEnum.AGREED
                            ? "Both sides have accepted"
                            : "Terms accepted",
                        description:
                          updated.status === TradeStatusEnum.AGREED
                            ? "These terms now govern the trade."
                            : "Waiting for the other party to accept.",
                        type: "success",
                      });
                    },
                    onError: onError("Couldn't accept these terms"),
                  },
                );
              }}
            >
              {accept.isPending ? <Spinner /> : "Accept Trade Terms"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

/** One term, in the confirmation dialog's summary of what is being agreed to. */
function TermRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-kumtru-slate-500">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
