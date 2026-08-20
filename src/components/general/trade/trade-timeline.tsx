import { TRADE_TIMELINE, progressionIndex } from "@/helpers/tradeStatus";
import { formatInZone } from "@/helpers/timezones";
import { TradeStatusEnum, type ITradeFulfilment } from "@/interfaces/trade";
import { cn } from "@/lib/utils";

export function TradeTimeline({
  status,
  fulfilment,
}: {
  status: TradeStatusEnum;
  fulfilment?: ITradeFulfilment;
}) {
  const currentIndex = progressionIndex(status);
  const isSettled = status === TradeStatusEnum.SETTLED;

  return (
    <div className="rounded-kumtru-md border border-border p-4">
      <ol>
        {TRADE_TIMELINE.map((step, index) => {
          const stepIndex = progressionIndex(step.status);
          const isDone = isSettled || currentIndex > stepIndex;
          const isCurrent = status === step.status;
          const isLast = index === TRADE_TIMELINE.length - 1;

          return (
            <li key={step.status} className={cn("relative flex gap-3", !isLast && "pb-5")}>
              <span
                aria-hidden="true"
                className={cn(
                  "z-1 mt-0.5 size-4 shrink-0 rounded-full",
                  isDone && "bg-kumtru-cyan",
                  isCurrent && "bg-kumtru-blue ring-3 ring-kumtru-blue-soft",
                  !isDone && !isCurrent && "bg-kumtru-slate-300",
                )}
              />

              {!isLast ? (
                <span
                  aria-hidden="true"
                  className="absolute top-5 bottom-0 left-[7px] w-0.5 bg-border"
                />
              ) : null}

              <div className={cn("min-w-0", !isDone && !isCurrent && "opacity-50")}>
                <p className="text-[13px] font-semibold">{step.label}</p>
                {isCurrent ? (
                  <p className="mt-0.5 text-[11px] text-kumtru-slate-500">Current state</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {fulfilment?.tracking ? (
        <p className="mt-2 border-t border-border pt-3 text-[11px] text-kumtru-slate-500">
          {fulfilment.courier} · <span className="font-mono">{fulfilment.tracking}</span>
          {fulfilment.dispatchedAt
            ? ` · dispatched ${formatInZone(fulfilment.dispatchedAt)}`
            : null}
        </p>
      ) : null}
    </div>
  );
}
