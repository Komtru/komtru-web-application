import Link from "next/link";
import type { ReactNode } from "react";

import { BrandLockup } from "@/components/general/brand-mark";
import { MarketingNavbar } from "@/components/general/marketing-navbar";
import { fonts } from "@/app/fonts";

const footerColumns = [
  {
    heading: "Product",
    links: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "Protection", href: "/#protection" },
      { label: "Trust profiles", href: "/#trust" },
      { label: "Pricing", href: "/#pricing" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Sign in", href: "/auth/login" },
      { label: "Create account", href: "/auth/register" },
      { label: "Find a trade", href: "/auth/login" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${fonts.body.className} min-h-screen bg-kumtru-navy`}>
      <MarketingNavbar />

      <main className="pt-24">{children}</main>

      <footer className="border-t border-white/10 px-6 py-12">
        <div className="mx-auto grid max-w-5xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <BrandLockup className="text-[15px] text-white" />
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-kumtru-slate-400">
              Trade protection and trust infrastructure for people who have no reason to trust each
              other yet.
            </p>
          </div>

          {footerColumns.map((column) => (
            <div key={column.heading}>
              <p className="text-xs font-semibold tracking-wide text-white uppercase">
                {column.heading}
              </p>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={`${column.heading}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-xs text-kumtru-slate-400 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 flex max-w-5xl flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
          <p className="text-xs text-kumtru-slate-400">
            © {new Date().getFullYear()} Komtru. All rights reserved.
          </p>
          <p className="max-w-md text-[11px] leading-relaxed text-kumtru-slate-500">
            Komtru will never ask you to pay outside an active trade, share a one-time code, or send
            money to a personal account.
          </p>
        </div>
      </footer>
    </div>
  );
}
