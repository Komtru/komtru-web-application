"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  label: string;
  value: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxDisplayed?: number;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select options",
  disabled,
  maxDisplayed = 3,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selected = options.filter((option) => value.includes(option.value));

  function toggle(optionValue: string) {
    onChange(
      value.includes(optionValue)
        ? value.filter((item) => item !== optionValue)
        : [...value, optionValue],
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("h-auto min-h-11 w-full justify-between gap-2 py-2", className)}
        >
          <span className="flex flex-wrap items-center gap-1.5">
            {selected.length === 0 ? (
              <span className="font-normal text-kumtru-slate-500">{placeholder}</span>
            ) : (
              <>
                {selected.slice(0, maxDisplayed).map((option) => (
                  <Badge key={option.value} variant="secondary" className="gap-1 font-normal">
                    {option.label}
                    <X
                      className="size-3 cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggle(option.value);
                      }}
                    />
                  </Badge>
                ))}
                {selected.length > maxDisplayed ? (
                  <Badge variant="secondary" className="font-normal">
                    +{selected.length - maxDisplayed}
                  </Badge>
                ) : null}
              </>
            )}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-kumtru-slate-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-1">
        <ScrollArea className="max-h-60">
          {options.map((option) => {
            const isSelected = value.includes(option.value);

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggle(option.value)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
                  isSelected && "font-medium",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-[4px] border border-input",
                    isSelected && "border-kumtru-blue bg-kumtru-blue text-white",
                  )}
                >
                  {isSelected ? <Check className="size-3" /> : null}
                </span>
                {option.label}
              </button>
            );
          })}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
