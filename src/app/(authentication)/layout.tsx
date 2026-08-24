"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

import { BrandLockup } from "@/components/general/brand-mark";
import { fonts } from "@/app/fonts";

const assurances = [
  "Terms are agreed by both sides before any money moves.",
  "Payments are held under the trade's own release conditions.",
  "Every completed trade builds a Trust Profile you carry with you.",
];

export default function AuthenticationLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${fonts.body.className} flex min-h-dvh flex-col`}>
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Brand panel */}
        <aside className="relative hidden flex-col justify-between bg-kumtru-navy p-10 text-white lg:flex lg:w-[46%] xl:w-[42%]">
          <Link href="/" className="w-fit">
            <BrandLockup className="text-lg text-white" />
          </Link>

          <div className="max-w-md">
            <h1 className="text-3xl leading-tight font-semibold text-balance">
              Trade with anyone. Trust the process.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-kumtru-slate-300">
              Komtru sits between two parties who have no reason to trust each other yet — and gives
              them one.
            </p>

            <ul className="mt-8 space-y-4">
              {assurances.map((assurance) => (
                <li key={assurance} className="flex gap-3">
                  <ShieldCheck
                    className="mt-0.5 size-4 shrink-0 text-kumtru-cyan"
                    aria-hidden="true"
                  />
                  <span className="text-[13px] leading-relaxed text-kumtru-slate-200">
                    {assurance}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-kumtru-slate-400">
            Komtru will never ask you to pay outside an active trade, share a one-time code, or send
            money to a personal account.
          </p>
        </aside>

        {/* Form column */}
        <main className="flex flex-1 flex-col">
          <div className="flex items-center justify-between p-6 lg:hidden">
            <Link href="/">
              <BrandLockup className="text-base" />
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center px-6 py-10 lg:px-12">
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="w-full max-w-[420px]"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-kumtru-slate-500 lg:px-12">
            <span>© {new Date().getFullYear()} Komtru. All rights reserved.</span>
            <nav className="flex gap-4">
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                Terms
              </Link>
            </nav>
          </footer>
        </main>
      </div>
    </div>
  );
}
