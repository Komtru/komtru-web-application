"use client";

import { useParams, useRouter } from "next/navigation";
import { FileText, Image as ImageIcon, StickyNote } from "lucide-react";

import { ScreenHeader } from "@/components/general/app/screen-header";
import { InitialsAvatar } from "@/components/general/app/initials-avatar";
import { SafetyCallout } from "@/components/general/safety-callout";
import { TradeActions } from "@/components/general/trade/trade-actions";
import { TradeTimeline } from "@/components/general/trade/trade-timeline";
import { TrustStatusChip } from "@/components/general/trust-status-chip";
import { Spinner } from "@/components/ui/spinner";
import { toErrorMessage } from "@/helpers/errors";
import { formatMoney } from "@/helpers/numbers";
import { humanizeToken } from "@/helpers/strings";
import { formatInZone, relativeFromNow } from "@/helpers/timezones";
import { TradeRoleEnum, TradeStatusEnum, type ITradeEvidence } from "@/interfaces/trade";
import { useAuthStore } from "@/store/auth.store";
import { useTradeByCode } from "@/services/trade.services";

const EVIDENCE_ICON: Record<ITradeEvidence["kind"], typeof FileText> = {
  image: ImageIcon,
  document: FileText,
  note: StickyNote,
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-kumtru-md border border-border p-4">
      <p className="mb-2.5 text-[11px] font-semibold tracking-wide text-kumtru-slate-500 uppercase">
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 text-[12.5px]">
      <span className="text-kumtru-slate-500">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

/**
 * A single trade, rendered from the full `ITrade` shape: participants,
 * subject, financials, agreement, fulfilment, evidence, dispute, and the
 * state-machine timeline with trust events woven in. Action buttons
 * (accept/fund/ship/confirm/dispute) are delegated to `TradeActions`, which
 * decides what's relevant for the current status and the viewer's own role.
 */
export default function TradeDetailPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const viewerId = useAuthStore((state) => state.user?.userId);

  const { data: trade, isLoading, isError, error, refetch } = useTradeByCode(params.code);

  return (
    <div className="flex flex-1 flex-col">
      <ScreenHeader title={trade?.tradeCode ?? params.code} onBack={() => router.push("/trades")} />

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner size="lg" className="text-kumtru-blue" />
        </div>
      ) : isError || !trade ? (
        <div className="flex-1 px-4 pt-4">
          <SafetyCallout variant="risk" title="Couldn't load this trade.">
            {toErrorMessage(error, "Something went wrong.")}{" "}
            <button type="button" onClick={() => void refetch()} className="font-semibold underline">
              Try again
            </button>
          </SafetyCallout>
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div>
              <div className="flex items-center gap-2">
                <TrustStatusChip status={trade.status} />
                <span className="text-[11px] text-kumtru-slate-400">
                  Opened {relativeFromNow(trade.createdAt)}
                </span>
              </div>
              <p className="mt-2 text-2xl font-semibold">
                {formatMoney(trade.financials.amount, trade.financials.currency)}
              </p>
              <p className="text-sm text-kumtru-slate-600">{trade.subject.title}</p>
              {trade.subject.description ? (
                <p className="mt-1 text-xs text-kumtru-slate-500">{trade.subject.description}</p>
              ) : null}
            </div>

            <SectionCard title="Participants">
              <div className="space-y-3">
                {trade.participants.map((participant) => (
                  <div key={participant.userId} className="flex items-center gap-2.5">
                    <InitialsAvatar name={participant.displayName ?? "Trade partner"} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium">
                        {participant.displayName ?? "Awaiting redemption"}
                        {participant.userId === viewerId ? " (you)" : ""}
                      </p>
                      <p className="text-[11px] text-kumtru-slate-500">
                        {participant.role === TradeRoleEnum.SELLER ? "Merchant / Seller" : "Buyer"}
                      </p>
                    </div>
                    {/* Whether this person has accepted the *agreement*, read
                        from `agreement.acceptedBy`. Not `acceptanceStatus`:
                        that means "is on the trade", is written as `accepted`
                        the moment someone creates or redeems it, and so
                        labelled every party as having accepted terms nobody
                        had yet agreed to. */}
                    <span
                      className={
                        "shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold " +
                        (trade.agreement.acceptedBy.includes(participant.userId)
                          ? "bg-kumtru-success-soft text-kumtru-success-on-soft"
                          : "bg-kumtru-warning-soft text-kumtru-warning-on-soft")
                      }
                    >
                      {trade.agreement.acceptedBy.includes(participant.userId)
                        ? "Accepted terms"
                        : "Not yet accepted"}
                    </span>
                  </div>
                ))}
                {trade.participants.length < 2 ? (
                  <p className="text-[11px] text-kumtru-slate-400">
                    Waiting for the counterpart to redeem this Trade Code.
                  </p>
                ) : null}
              </div>
            </SectionCard>

            <TradeTimeline
              status={trade.status}
              fulfilment={trade.fulfilment}
              trustEvents={trade.trustEvents}
            />

            <SectionCard title="Agreement">
              <Field label="Delivery terms" value={trade.agreement.deliveryTerms} />
              <Field label="Inspection window" value={trade.agreement.inspectionPeriod} />
              {trade.agreement.cancellationTerms ? (
                <Field label="Cancellation" value={trade.agreement.cancellationTerms} />
              ) : null}
              {trade.agreement.disputeTerms ? (
                <Field label="Dispute terms" value={trade.agreement.disputeTerms} />
              ) : null}
              <Field
                label="Accepted by"
                value={`${trade.agreement.acceptedBy.length} of ${trade.participants.length}`}
              />

              {/* Why the trade is sitting still, when it is. The accept button
                  disappears once you have accepted, so without this the user
                  who moved first has no way to tell that anything is pending. */}
              {trade.status === TradeStatusEnum.OPEN && trade.participants.length >= 2 ? (
                <p className="mt-2 text-[11px] leading-relaxed text-kumtru-slate-500">
                  {viewerId && trade.agreement.acceptedBy.includes(viewerId)
                    ? "You have accepted. The trade moves on once the other party does too."
                    : "These terms take effect once both sides accept."}
                </p>
              ) : null}
            </SectionCard>

            <SectionCard title="Escrow & Payment">
              <Field label="Payment" value={humanizeToken(trade.financials.paymentStatus)} />
              <Field label="Protection" value={humanizeToken(trade.financials.protectionStatus)} />
              <Field label="Release" value={humanizeToken(trade.financials.releaseStatus)} />
              {trade.financials.fees ? (
                <Field
                  label="Fees"
                  value={formatMoney(trade.financials.fees, trade.financials.currency)}
                />
              ) : null}
            </SectionCard>

            {trade.fulfilment.status !== "not_started" ? (
              <SectionCard title="Fulfilment">
                <Field label="Status" value={humanizeToken(trade.fulfilment.status)} />
                {trade.fulfilment.courier ? (
                  <Field label="Courier" value={trade.fulfilment.courier} />
                ) : null}
                {trade.fulfilment.tracking ? (
                  <Field label="Tracking" value={trade.fulfilment.tracking} />
                ) : null}
                {trade.fulfilment.dispatchedAt ? (
                  <Field label="Dispatched" value={formatInZone(trade.fulfilment.dispatchedAt)} />
                ) : null}
                {trade.fulfilment.deliveredAt ? (
                  <Field label="Delivered" value={formatInZone(trade.fulfilment.deliveredAt)} />
                ) : null}
              </SectionCard>
            ) : null}

            {trade.evidence.length > 0 ? (
              <SectionCard title="Evidence">
                <div className="space-y-2.5">
                  {trade.evidence.map((item) => {
                    const Icon = EVIDENCE_ICON[item.kind];
                    return (
                      <div key={item.evidenceId} className="flex items-start gap-2.5">
                        <Icon className="mt-0.5 size-3.5 shrink-0 text-kumtru-slate-400" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="text-[12.5px]">{item.note ?? item.url ?? "Evidence attached"}</p>
                          <p className="text-[11px] text-kumtru-slate-400">
                            {relativeFromNow(item.uploadedAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            ) : null}

            {trade.dispute ? (
              <SectionCard title="Dispute">
                <Field label="Status" value={humanizeToken(trade.dispute.status)} />
                <Field label="Reason" value={trade.dispute.reason} />
                <Field label="Opened" value={relativeFromNow(trade.dispute.openedAt)} />
                {trade.dispute.resolution ? (
                  <Field label="Resolution" value={trade.dispute.resolution} />
                ) : null}
              </SectionCard>
            ) : null}
          </div>

          <TradeActions trade={trade} viewerId={viewerId} />
        </>
      )}
    </div>
  );
}
