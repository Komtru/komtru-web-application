"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  FileCheck2,
  PackageCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: FileCheck2,
    title: "Agree the terms",
    body: "Item, price, delivery, inspection window, what happens if it goes wrong. Both sides accept before anything moves.",
  },
  {
    icon: Banknote,
    title: "Protect the payment",
    body: "The buyer funds the trade. The money sits under that trade's release conditions — not in the seller's account, not in ours to spend.",
  },
  {
    icon: PackageCheck,
    title: "Fulfil and inspect",
    body: "The seller ships with tracking. The buyer gets a stated inspection window to check the item against what was agreed.",
  },
  {
    icon: ShieldCheck,
    title: "Release or resolve",
    body: "Confirm and the seller is paid immediately. Raise an issue and the agreement — not an argument — decides the outcome.",
  },
];

const protections = [
  {
    title: "Buyers don't pay into the dark",
    body: "Your money is only released when you confirm, or when the inspection window you agreed to lapses. Both are stated up front.",
  },
  {
    title: "Sellers don't ship into the dark",
    body: "You can see the payment is protected before you dispatch. No more sending goods against a screenshot.",
  },
  {
    title: "Codes, not links",
    body: "Every trade has a code the other party looks up themselves inside Komtru. Nothing depends on a link someone sent you.",
  },
];

export function LandingPage() {
  return (
    <div className="text-white">
      {/* Hero */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-kumtru-slate-200"
          >
            <Sparkles className="size-3.5 text-kumtru-cyan" aria-hidden="true" />
            Trade protection, not a payment link
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="mt-6 text-4xl leading-[1.1] font-semibold text-balance sm:text-5xl"
          >
            Trade with anyone. Trust the process.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-kumtru-slate-300"
          >
            Komtru holds the payment while the deal plays out. Terms agreed first, funds protected
            in the middle, released only when the agreement is met.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Button asChild size="xl" variant="trust">
              <Link href="/auth/register">
                Start a protected trade
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="xl"
              variant="ghost"
              className="border border-white/15 text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/auth/login">I have a trade code</Link>
            </Button>
          </motion.div>

          <p className="mt-6 text-xs text-kumtru-slate-400">
            No subscription. A protection fee applies per trade, quoted before you pay.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-white/10 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-semibold sm:text-3xl">How a Komtru trade runs</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-kumtru-slate-300">
            Four states, in order, with a named party responsible for each. Nobody can skip a step —
            not the buyer, not the seller, not us.
          </p>

          <ol className="mt-10 grid gap-4 sm:grid-cols-2">
            {steps.map(({ icon: Icon, title, body }, index) => (
              <li
                key={title}
                className="rounded-kumtru-lg border border-white/10 bg-white/[0.03] p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-kumtru-cyan/15">
                    <Icon className="size-4 text-kumtru-cyan" aria-hidden="true" />
                  </span>
                  <span className="font-mono text-xs text-kumtru-slate-400">Step {index + 1}</span>
                </div>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-kumtru-slate-300">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Protection */}
      <section id="protection" className="border-t border-white/10 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-semibold sm:text-3xl">What protection actually means</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-kumtru-slate-300">
            Not a promise, a mechanism. Here is exactly what changes for each side.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {protections.map(({ title, body }) => (
              <div
                key={title}
                className="rounded-kumtru-lg border border-white/10 bg-white/[0.03] p-5"
              >
                <ShieldCheck className="size-5 text-kumtru-cyan" aria-hidden="true" />
                <h3 className="mt-4 text-sm font-semibold">{title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-kumtru-slate-300">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust profiles */}
      <section id="trust" className="border-t border-white/10 px-6 py-20">
        <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold sm:text-3xl">Reputation you carry with you</h2>
            <p className="mt-4 text-sm leading-relaxed text-kumtru-slate-300">
              Every honoured trade adds to your Trust Profile — completions, on-time fulfilment,
              disputes raised and how they ended. It follows you between counterparties, so a good
              record on one deal is worth something on the next.
            </p>

            <ul className="mt-6 space-y-3">
              {[
                "Built only from real, completed trades — not self-reported claims.",
                "Visible to a counterparty before they accept your terms.",
                "Disputes are recorded honestly, including the outcome.",
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <BadgeCheck
                    className="mt-0.5 size-4 shrink-0 text-kumtru-cyan"
                    aria-hidden="true"
                  />
                  <span className="text-[13px] leading-relaxed text-kumtru-slate-300">{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-kumtru-lg border border-white/10 bg-white/[0.03] p-6">
            <p className="text-[11px] font-semibold tracking-wide text-kumtru-slate-400 uppercase">
              Trust profile
            </p>
            <p className="mt-3 text-lg font-semibold">TechEdge NG</p>
            <div className="mt-5 grid grid-cols-2 gap-4">
              {[
                { label: "Trades completed", value: "128" },
                { label: "On-time fulfilment", value: "97.4%" },
                { label: "Disputes raised", value: "3" },
                { label: "Member since", value: "2024" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="font-mono text-xl font-semibold">{value}</p>
                  <p className="mt-1 text-[11px] text-kumtru-slate-400">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-white/10 px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold sm:text-3xl">One fee, quoted before you pay</h2>
          <p className="mt-4 text-sm leading-relaxed text-kumtru-slate-300">
            A 1.5% protection fee is added when a buyer funds a trade. You see the exact total on
            the funding screen before anything is charged. No monthly fee, no fee on a trade that
            never gets funded.
          </p>

          <div className="mt-8 rounded-kumtru-lg border border-white/10 bg-white/[0.03] p-8">
            <p className="font-mono text-4xl font-semibold">1.5%</p>
            <p className="mt-2 text-xs text-kumtru-slate-400">per funded trade</p>
            <Button asChild size="xl" variant="trust" className="mt-6 w-full">
              <Link href="/auth/register">Create your account</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
