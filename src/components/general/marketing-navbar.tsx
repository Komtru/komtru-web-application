"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { BrandLockup } from "@/components/general/brand-mark";
import { Button } from "@/components/ui/button";
import { marketingNav } from "@/config/navigation";
import { cn } from "@/lib/utils";

export function MarketingNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed inset-x-0 top-4 z-50 px-4">
      <nav
        className={cn(
          "mx-auto flex max-w-5xl items-center gap-4 rounded-full px-4 py-2.5",
          "border border-white/10 bg-kumtru-navy/85 shadow-lg backdrop-blur-md",
        )}
      >
        <Link href="/" className="shrink-0">
          <BrandLockup className="text-[15px] text-white" />
        </Link>

        <ul className="ms-4 hidden items-center gap-1 md:flex">
          {marketingNav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="rounded-full px-3 py-1.5 text-[13px] text-kumtru-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ms-auto hidden items-center gap-2 md:flex">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/auth/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" variant="trust">
            <Link href="/auth/register">Get started</Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="ms-auto rounded-full p-2 text-white hover:bg-white/10 md:hidden"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </nav>

      {open ? (
        <div className="mx-auto mt-2 max-w-5xl rounded-2xl border border-white/10 bg-kumtru-navy/95 p-4 shadow-lg backdrop-blur-md md:hidden">
          <ul className="space-y-1">
            {marketingNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm text-kumtru-slate-200 hover:bg-white/10 hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-3 grid gap-2">
            <Button asChild variant="secondary" className="w-full">
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <Button asChild variant="trust" className="w-full">
              <Link href="/auth/register">Get started</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
