import Link from "next/link";

import { InitialsAvatar } from "@/components/general/app/initials-avatar";
import { TrustStatusChip } from "@/components/general/trust-status-chip";
import { formatMoney } from "@/helpers/numbers";
import type { TradeStatusEnum } from "@/interfaces/trade";

export interface TradeRowProps {
  tradeCode: string;
  amount: number;
  currency?: string;
  status: TradeStatusEnum;
  counterpartyName: string;
  /** One line of plain-language context: item, then what is happening to it. */
  summary: string;
  href?: string;
}

/**
 * The list unit on the Trades tab. Amount and status lead, because those are the
 * two things a buyer scans for; the item and counterparty follow.
 */
export function TradeRow({
  tradeCode,
  amount,
  currency = "NGN",
  status,
  counterpartyName,
  summary,
  href,
}: TradeRowProps) {
  const content = (
    <>
      <div className="mb-2 flex items-start justify-between gap-3">
        <span className="font-mono text-base font-semibold">{formatMoney(amount, currency)}</span>
        <TrustStatusChip status={status} />
      </div>

      <div className="flex items-center gap-1.5 text-xs text-kumtru-slate-600">
        <InitialsAvatar name={counterpartyName} size="sm" />
        {counterpartyName}
      </div>

      <p className="mt-1.5 text-[11px] text-kumtru-slate-400">
        {summary} · <span className="font-mono">{tradeCode}</span>
      </p>
    </>
  );

  const className =
    "bg-card border-border rounded-kumtru-md block border p-3.5 transition-colors active:bg-secondary";

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
