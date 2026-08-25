"use client";

import Link from "next/link";
import { LifeBuoy, Plus } from "lucide-react";

import { EmptyState } from "@/components/general/app/empty-state";
import { StickyActionBar } from "@/components/general/app/sticky-action-bar";
import { SafetyCallout } from "@/components/general/safety-callout";
import { TicketRow } from "@/components/general/ticket/ticket-row";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toErrorMessage } from "@/helpers/errors";
import { useMyTickets } from "@/services/tickets.services";

/**
 * Help & Support — every ticket this user has ever opened, newest first.
 *
 * Reached from the drawer's "Get help" row and from Settings' Support group (see
 * `config/navigation.tsx` and the Settings page) — never from a fifth tab. Support is something a
 * customer reaches for occasionally, not a place they live; giving it a permanent thumb slot on the bar
 * would cost the four destinations that earned one a fifth of their width for that.
 */
export default function HelpPage() {
  const { data: tickets, isLoading, isError, error, refetch } = useMyTickets();

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6">
        <h1 className="text-lg font-semibold">Help & Support</h1>
        <p className="mt-1 mb-4 text-[11.5px] text-kumtru-slate-500">
          Every ticket you have opened with Komtru, and how it's going.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" className="text-kumtru-blue" />
          </div>
        ) : isError ? (
          <SafetyCallout variant="risk" title="Couldn't load your tickets.">
            {toErrorMessage(error, "Something went wrong.")}{" "}
            <button type="button" onClick={() => void refetch()} className="font-semibold underline">
              Try again
            </button>
          </SafetyCallout>
        ) : tickets && tickets.length > 0 ? (
          <div className="space-y-2.5">
            {tickets.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={LifeBuoy}
            title="No support tickets"
            description="Payment stuck, a delivery gone wrong, trouble verifying your account — start here and Komtru support will pick it up."
          />
        )}
      </div>

      <StickyActionBar>
        <Button asChild size="xl" className="w-full">
          <Link href="/help/new">
            <Plus className="size-4" />
            New ticket
          </Link>
        </Button>
      </StickyActionBar>
    </div>
  );
}
