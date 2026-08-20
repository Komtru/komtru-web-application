"use client";

import { useCallback } from "react";
import { AlertTriangle, CheckCircle2, CircleX, Info } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

export type ToastType = "info" | "success" | "warning" | "error";

export interface ShowToastOptions {
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
}

const iconMap = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: CircleX,
} as const;

const colorMap = {
  info: {
    border: "border-l-kumtru-info",
    icon: "text-kumtru-info",
  },
  success: {
    border: "border-l-kumtru-success",
    icon: "text-kumtru-success",
  },
  warning: {
    border: "border-l-kumtru-warning",
    icon: "text-kumtru-warning",
  },
  error: {
    border: "border-l-kumtru-risk",
    icon: "text-kumtru-risk",
  },
} as const;

export function useCustomToast() {
  const showToast = useCallback(
    ({ title, description, type = "info", duration = 4500 }: ShowToastOptions) => {
      const Icon = iconMap[type];
      const colors = colorMap[type];

      return toast.custom(
        (id) => (
          <div
            role="status"
            onClick={() => toast.dismiss(id)}
            className={cn(
              "flex w-full max-w-sm cursor-pointer items-start gap-3 rounded-kumtru-md border border-l-4 border-border bg-card p-3.5 shadow-lg",
              colors.border,
            )}
          >
            <Icon className={cn("mt-0.5 size-4 shrink-0", colors.icon)} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              {description ? (
                <p className="mt-0.5 text-xs leading-relaxed text-kumtru-slate-500">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
        ),
        { duration },
      );
    },
    [],
  );

  return { showToast };
}
