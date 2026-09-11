"use client";

import { useState, useEffect } from "react";
import { FileCheck, ShieldAlert, Truck, XCircle, Info, Building2 } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  useAvailableCouriers,
  useRequestCourierPackage,
} from "@/services/logistics.services";

import type { ILogisticsPackage } from "@/interfaces/logistics";

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
function getAvailableActions(
  trade: ITrade,
  viewerId: string | undefined,
  activePackage?: ILogisticsPackage | null
): AvailableAction[] {
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

  // Only show "Mark as Shipped" if seller hasn't handed over fulfilment to an active courier package
  const hasActiveCourier =
    activePackage &&
    activePackage.status !== "REJECTED" &&
    ["REQUESTED", "ACCEPTED", "PICKED_UP", "PACKAGED", "SHIPPED", "DELIVERED"].includes(
      activePackage.status
    );

  if (
    trade.status === TradeStatusEnum.PROTECTED &&
    viewer.role === TradeRoleEnum.SELLER &&
    !hasActiveCourier
  ) {
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

export function TradeActions({
  trade,
  viewerId,
  openShipModalSignal,
  activePackage,
}: {
  trade: ITrade;
  viewerId: string | undefined;
  openShipModalSignal?: number;
  activePackage?: ILogisticsPackage | null;
}) {
  const { showToast } = useCustomToast();

  const accept = useAcceptTrade();
  const fund = useFundTrade();
  const confirm = useConfirmDelivery();
  const cancel = useCancelTrade();
  const ship = useShipTrade();
  const dispute = useRaiseDispute();

  const { data: couriers = [], isLoading: isLoadingCouriers } = useAvailableCouriers();
  const requestCourierPackage = useRequestCourierPackage();

  const [acceptOpen, setAcceptOpen] = useState(false);

  const [shipOpen, setShipOpen] = useState(false);
  const [shipMode, setShipMode] = useState<"company" | "manual">("company");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [courier, setCourier] = useState("");
  const [tracking, setTracking] = useState("");

  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  // Re-open ship modal when external signal fires (e.g. from rejection banner)
  useEffect(() => {
    if (openShipModalSignal && openShipModalSignal > 0) {
      setSelectedCompanyId("");
      setCourier("");
      setTracking("");
      setShipOpen(true);
    }
  }, [openShipModalSignal]);

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

  function handleManualShip() {
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

  function handleCompanyShip() {
    if (!selectedCompanyId || requestCourierPackage.isPending) return;
    requestCourierPackage.mutate(
      { tradeCode: trade.tradeCode, companyId: selectedCompanyId },
      {
        onSuccess: () => {
          setShipOpen(false);
          setSelectedCompanyId("");
          showToast({
            title: "Pickup Requested",
            description: "The logistics partner has been notified to pick up the package.",
            type: "success",
          });
        },
        onError: onError("Couldn't request courier pickup"),
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
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Ship Item</DialogTitle>
            <DialogDescription>
              Choose a verified logistics partner or arrange delivery manually.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={shipMode}
            onValueChange={(val) => setShipMode(val as "company" | "manual")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="company" className="text-xs">
                <Building2 className="mr-1.5 size-3.5" />
                Verified Courier
              </TabsTrigger>
              <TabsTrigger value="manual" className="text-xs">
                <Truck className="mr-1.5 size-3.5" />
                Arrange My Own
              </TabsTrigger>
            </TabsList>

            <TabsContent value="company" className="mt-3 space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-kumtru-slate-600">
                  Select Logistics Company
                </label>
                {isLoadingCouriers ? (
                  <div className="flex h-10 items-center justify-center rounded-md border border-input">
                    <Spinner size="sm" className="text-kumtru-blue" />
                  </div>
                ) : (
                  <Select
                    value={selectedCompanyId}
                    onValueChange={setSelectedCompanyId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a verified courier partner" />
                    </SelectTrigger>
                    <SelectContent>
                      {couriers.length === 0 ? (
                        <div className="p-2 text-center text-xs text-muted-foreground">
                          No active couriers available.
                        </div>
                      ) : (
                        couriers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex items-start gap-2 rounded-md bg-secondary/80 p-2.5 text-xs text-kumtru-slate-600">
                <Info className="mt-0.5 size-3.5 shrink-0 text-kumtru-blue" />
                <span>
                  Shipping fee is arranged directly with the courier. Once requested, the courier will be dispatched for pickup.
                </span>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  size="lg"
                  className="w-full"
                  disabled={!selectedCompanyId || requestCourierPackage.isPending}
                  onClick={handleCompanyShip}
                >
                  {requestCourierPackage.isPending ? <Spinner /> : "Request Courier Pickup"}
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="manual" className="mt-3 space-y-3.5">
              <div className="space-y-3.5">
                <FloatingLabelInput
                  label="Courier Name"
                  required
                  value={courier}
                  onChange={(event) => setCourier(event.target.value)}
                  placeholder=" "
                />
                <FloatingLabelInput
                  label="Tracking Number (optional)"
                  value={tracking}
                  onChange={(event) => setTracking(event.target.value)}
                  placeholder=" "
                />
              </div>

              <div className="flex items-start gap-2 rounded-md bg-secondary/80 p-2.5 text-xs text-kumtru-slate-600">
                <Info className="mt-0.5 size-3.5 shrink-0 text-kumtru-slate-500" />
                <span>
                  You are arranging transport directly. The buyer will use the details provided above to track shipment.
                </span>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  size="lg"
                  className="w-full"
                  disabled={!courier.trim() || ship.isPending}
                  onClick={handleManualShip}
                >
                  {ship.isPending ? <Spinner /> : "Confirm Shipment"}
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
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
