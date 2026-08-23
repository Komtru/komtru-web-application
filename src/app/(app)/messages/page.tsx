"use client";

import { MessageSquare } from "lucide-react";

import { EmptyState } from "@/components/general/app/empty-state";
import { SafetyCallout } from "@/components/general/safety-callout";

/**
 * Messages tab — frame only.
 *
 * Threads, composing and read-state belong to the Messaging module. Each thread
 * is scoped to a trade, which is why there is no "new message" action here.
 */
export default function MessagesPage() {
  return (
    <div className="flex-1 px-4 pt-4 pb-6">
      <h1 className="text-lg font-semibold">Messages</h1>
      <p className="mt-1 mb-4 text-[11.5px] text-kumtru-slate-500">
        One thread per trade, kept on the record.
      </p>

      <EmptyState
        icon={MessageSquare}
        title="No messages"
        description="When you start a trade, the thread with that seller opens here."
      />

      <SafetyCallout className="mt-4" title="Keep it in here.">
        Messages in a trade are part of its record and can be used if you dispute it. A seller
        pushing you onto WhatsApp is removing that record.
      </SafetyCallout>
    </div>
  );
}
