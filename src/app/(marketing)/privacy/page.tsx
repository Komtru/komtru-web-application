import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Kumtru collects, uses and protects your personal data.",
};

const sections = [
  {
    heading: "What we collect",
    body: "Account details you give us (name, email, phone), the trades you take part in, the terms you agree to, payment and payout references from our payment partners, and technical data such as device and IP address used to detect fraud.",
  },
  {
    heading: "Why we collect it",
    body: "To run trades you initiate or accept, to hold and release protected payments under the terms both parties agreed, to build your Trust Profile from real completed trades, to investigate disputes, and to meet our legal and anti-fraud obligations.",
  },
  {
    heading: "What we share",
    body: "Counterparties on a trade see your display name, Trust Profile and the trade's own details — never your full contact record. We share data with payment processors, identity verification providers and, where legally required, regulators and law enforcement. We do not sell personal data.",
  },
  {
    heading: "How long we keep it",
    body: "Trade records, agreements and dispute outcomes are retained for as long as required by financial record-keeping law, because they are the evidence a protected trade rests on. Marketing preferences are deleted on request.",
  },
  {
    heading: "Your rights",
    body: "You can access, correct or export your data, object to processing, and close your account. Some records must be retained after closure where law requires it; we will tell you which. Contact privacy@kumtru.com to exercise any of these.",
  },
  {
    heading: "Security",
    body: "Access to production data is restricted and logged. Two-step verification is available on every account and we strongly recommend it — it protects the one action that moves money.",
  },
];

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 pb-24 text-white">
      <h1 className="text-3xl font-semibold">Privacy Policy</h1>
      <p className="mt-2 text-xs text-kumtru-slate-400">Last updated 20 August 2026</p>

      <p className="mt-8 text-sm leading-relaxed text-kumtru-slate-300">
        This policy explains what Kumtru does with your data. It is written to be read, not to be
        skipped.
      </p>

      <div className="mt-10 space-y-8">
        {sections.map(({ heading, body }) => (
          <section key={heading}>
            <h2 className="text-lg font-semibold">{heading}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-kumtru-slate-300">{body}</p>
          </section>
        ))}
      </div>

      <p className="mt-12 text-xs leading-relaxed text-kumtru-slate-400">
        This page is a template for a production policy. Have it reviewed by qualified counsel in
        each market you operate in before launch.
      </p>
    </article>
  );
}
