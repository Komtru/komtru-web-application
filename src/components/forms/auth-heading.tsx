import type { ReactNode } from "react";

export function AuthHeading({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="mb-7">
      <h2 className="text-2xl font-semibold">{title}</h2>
      {description ? (
        <p className="mt-2 text-[13px] leading-relaxed text-kumtru-slate-500">{description}</p>
      ) : null}
    </div>
  );
}
