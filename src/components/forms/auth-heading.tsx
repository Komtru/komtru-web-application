import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function AuthHeading({
  title,
  description,
  className,
}: {
  title: string;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-7", className)}>
      <h2 className="text-2xl font-semibold">{title}</h2>
      {description ? (
        <p className="mt-2 text-[13px] leading-relaxed text-kumtru-slate-500">{description}</p>
      ) : null}
    </div>
  );
}
