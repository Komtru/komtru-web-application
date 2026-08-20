import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing your use of Kumtru trade protection.",
};

const sections = [
  {
    heading: "What Kumtru does",
    body: "Kumtru provides trade protection: we record the terms both parties agree, hold the buyer's payment while the trade runs, and release it according to those terms. We are not a party to your trade and we do not guarantee the quality of any item or service.",
  },
  {
    heading: "Your account",
    body: "You must give accurate information, keep your credentials private, and not let anyone else use your account. You are responsible for actions taken with your credentials. Turn on two-step verification.",
  },
  {
    heading: "Agreements are binding",
    body: "When both parties accept a trade's terms, those terms govern the trade. Delivery window, inspection period, cancellation and dispute rules are all read from the accepted agreement — not from later messages.",
  },
  {
    heading: "Protected funds and release",
    body: "Funded amounts are held pending the release conditions in the agreement. Payment is released when the buyer confirms, when the inspection period lapses without an issue being raised, or when a dispute is resolved in the seller's favour. Refunds follow the same logic in reverse.",
  },
  {
    heading: "Fees",
    body: "A protection fee is charged when a trade is funded and is shown in full before payment. Fees for a funded trade are not refunded when a dispute is decided, because the protection was used.",
  },
  {
    heading: "Disputes",
    body: "Either party may raise a dispute within the inspection period. We review the agreement and the evidence submitted by both sides and issue a decision. Our decision determines how the protected funds are released.",
  },
  {
    heading: "Prohibited use",
    body: "No illegal goods or services, no sanctioned parties, no money laundering, no using Kumtru to lend credibility to a trade you do not intend to honour. We may suspend an account and freeze protected funds where we reasonably suspect fraud.",
  },
  {
    heading: "Safety",
    body: "Kumtru will never ask you to pay outside an active trade, share a one-time code, or send money to a personal account. Requests of that kind are fraud, regardless of who appears to be asking.",
  },
  {
    heading: "Liability",
    body: "Our liability is limited to the protection fee paid on the affected trade, except where the law does not allow that limit. We are not liable for the conduct of a counterparty beyond the protection mechanism described here.",
  },
];

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 pb-24 text-white">
      <h1 className="text-3xl font-semibold">Terms of Service</h1>
      <p className="mt-2 text-xs text-kumtru-slate-400">Last updated 20 August 2026</p>

      <p className="mt-8 text-sm leading-relaxed text-kumtru-slate-300">
        By creating a Kumtru account or taking part in a Kumtru trade, you agree to these terms.
      </p>

      <ol className="mt-10 space-y-8">
        {sections.map(({ heading, body }, index) => (
          <li key={heading}>
            <h2 className="text-lg font-semibold">
              <span className="mr-2 font-mono text-sm text-kumtru-slate-400">{index + 1}.</span>
              {heading}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-kumtru-slate-300">{body}</p>
          </li>
        ))}
      </ol>

      <p className="mt-12 text-xs leading-relaxed text-kumtru-slate-400">
        This page is a template for production terms. Have it reviewed by qualified counsel in each
        market you operate in before launch.
      </p>
    </article>
  );
}
