"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface FloatingLabelInputProps extends React.ComponentProps<"input"> {
  label: string;
  /** Rendered under the field; use for hints, not for validation errors. */
  hint?: string;
  containerClassName?: string;
}

/**
 * Label floats above the field once it has focus or a value, using the
 * `peer` + `placeholder-shown` pattern so no JS state is needed.
 *
 * A single space is used as the placeholder deliberately — `placeholder-shown`
 * only matches while the field is empty, which is exactly the "label sits
 * inside the field" state.
 */
const FloatingLabelInput = React.forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  ({ label, hint, id, className, containerClassName, required, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    return (
      <div className={cn("w-full", containerClassName)}>
        <div className="relative">
          <Input
            {...props}
            id={inputId}
            ref={ref}
            required={required}
            placeholder=" "
            className={cn("peer h-14 px-3.5 pt-6 pb-2 text-[15px] md:text-[15px]", className)}
          />
          <label
            htmlFor={inputId}
            className={cn(
              "pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[15px] text-kumtru-slate-500 transition-all duration-150",
              "peer-focus:top-3.5 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:tracking-wide",
              "peer-not-placeholder-shown:top-3.5 peer-not-placeholder-shown:text-[11px] peer-not-placeholder-shown:font-semibold peer-not-placeholder-shown:tracking-wide",
              "peer-focus:text-kumtru-blue peer-disabled:opacity-50",
            )}
          >
            {label}
            {required ? <span className="ms-0.5 text-kumtru-risk">*</span> : null}
          </label>
        </div>
        {hint ? <p className="mt-1.5 text-xs text-kumtru-slate-500">{hint}</p> : null}
      </div>
    );
  },
);

FloatingLabelInput.displayName = "FloatingLabelInput";

export { FloatingLabelInput };
