"use client";

import { useState } from "react";
import { Check, Search, UserPlus, X } from "lucide-react";

import { ProfileAvatar } from "@/components/general/app/profile-avatar";
import { VerificationChip } from "@/components/general/app/verification-chip";
import { SafetyCallout } from "@/components/general/safety-callout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { meetsVerificationLevel } from "@/helpers/auth";
import { toErrorMessage } from "@/helpers/errors";
import {
  describeLookupChannel,
  detectLookupChannel,
  inviteChannelFor,
  inviteChannelLabel,
  normaliseLookupValue,
  partyLabel,
} from "@/helpers/party";
import {
  LOOKUP_MIN_LEVEL,
  type InviteChannel,
  type LookupChannel,
  type PartyCard,
} from "@/interfaces/party";
import { useLookupParty } from "@/services/party.services";
import { useAuthStore } from "@/store/auth.store";

/**
 * Who the other side is — either an account this user has confirmed, or a
 * destination they have chosen to invite.
 *
 * One union rather than two nullable fields, because the two are exclusive and
 * the caller has to do something different with each: an account is a person who
 * can already redeem the trade code, an invite is a message the API still has to
 * send. `label` is carried on both so callers can name the counterpart without
 * re-deriving it from three optional fields.
 */
export type Counterparty =
  | { kind: "account"; party: PartyCard; label: string }
  | { kind: "invite"; channel: InviteChannel; destination: string; label: string };

/**
 * Resolve-then-confirm, the way a transfer screen does it.
 *
 * Typing a name into a free-text box and pressing on is how money reaches the
 * wrong person. So this field will not hand a value back until the user has been
 * shown an actual account and said yes to it — and the "no" branch clears the
 * input rather than letting a rejected match linger where it could be submitted
 * by a second tap.
 *
 * Nothing is looked up while typing. The API escalates on *consecutive misses* —
 * CAPTCHA at 20, the whole capability suspended at 50 — and a field that fires
 * on every debounced pause spends that budget on half-typed input. So the search
 * is an explicit act: press Find, or hit Enter.
 */
export function CounterpartyField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: Counterparty | null;
  onChange: (next: Counterparty | null) => void;
}) {
  const user = useAuthStore((state) => state.user);
  const lookup = useLookupParty();

  const [query, setQuery] = useState("");
  /**
   * What the last search produced and is now waiting on an answer for. Held
   * separately from the mutation's own `data` so that clearing the prompt does
   * not require resetting the mutation, and so a stale result cannot reappear.
   */
  const [pending, setPending] = useState<
    | { stage: "confirm"; party: PartyCard }
    | { stage: "invite"; channel: InviteChannel; destination: string; typed: string }
    /** Found nothing, and nothing to send an invitation to either. */
    | { stage: "no-account"; searched: LookupChannel; requiresCaptcha: boolean }
    | null
  >(null);

  const channel = detectLookupChannel(query);
  const canLookUp = meetsVerificationLevel(user?.verificationLevel, LOOKUP_MIN_LEVEL);

  function reset() {
    setQuery("");
    setPending(null);
    lookup.reset();
  }

  function handleFind() {
    if (!channel || lookup.isPending) return;

    const normalised = normaliseLookupValue(channel, query);
    setPending(null);

    lookup.mutate(
      { channel, value: normalised },
      {
        onSuccess: (result) => {
          if (result.found) {
            setPending({ stage: "confirm", party: result.party });
            return;
          }

          // A username miss has nowhere to deliver an invitation, so the only
          // move left is a different kind of identifier. `canInvite` is trusted
          // over the channel we sent — it is the API's own answer about what is
          // possible next, and it is the field that will change if that ever does.
          if (!result.canInvite || channel === "USERNAME") {
            setPending({
              stage: "no-account",
              searched: channel,
              requiresCaptcha: result.requiresCaptcha === true,
            });
            return;
          }

          setPending({
            stage: "invite",
            channel: inviteChannelFor(channel),
            destination: normalised,
            typed: query.trim(),
          });
        },
      },
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Settled — the field is a statement of fact, not an input               */
  /* ---------------------------------------------------------------------- */

  if (value) {
    return (
      <div>
        <FieldLabel>{label}</FieldLabel>
        <div className="mt-1.5 flex items-center gap-3 rounded-kumtru-md border border-kumtru-success/30 bg-kumtru-success-soft p-3">
          {value.kind === "account" ? (
            <ProfileAvatar url={value.party.avatarUrl} name={value.label} size="md" />
          ) : (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-kumtru-success/15">
              <UserPlus className="size-4 text-kumtru-success-on-soft" aria-hidden="true" />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{value.label}</p>
            <p className="truncate text-[11px] text-kumtru-success-on-soft">
              {value.kind === "account"
                ? value.party.username
                  ? `@${value.party.username} · confirmed`
                  : "Confirmed"
                : `Will be invited by ${inviteChannelLabel(value.channel)}`}
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange(null);
              reset();
            }}
          >
            Change
          </Button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Searching                                                              */
  /* ---------------------------------------------------------------------- */

  return (
    <div>
      <FieldLabel>
        {label} <span className="text-kumtru-risk">*</span>
      </FieldLabel>

      <div className="mt-1.5 flex gap-2">
        <Input
          className="h-12 flex-1"
          placeholder={placeholder}
          value={query}
          disabled={!canLookUp}
          autoComplete="off"
          onChange={(event) => {
            setQuery(event.target.value);
            // Any edit invalidates the answer on screen: the card below must
            // never describe a different string than the one in the box.
            if (pending) setPending(null);
            if (lookup.isError) lookup.reset();
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            // This field lives inside a form-shaped dialog; Enter here means
            // "find this person", never "create the trade".
            event.preventDefault();
            handleFind();
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="h-12 shrink-0 px-4"
          disabled={!canLookUp || !channel || lookup.isPending}
          onClick={handleFind}
        >
          {lookup.isPending ? (
            <Spinner />
          ) : (
            <>
              <Search className="size-4" aria-hidden="true" />
              Find
            </>
          )}
        </Button>
      </div>

      {!canLookUp ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-kumtru-warning-on-soft">
          Verify your email address and phone number to look up a counterpart.
        </p>
      ) : (
        <p className="mt-1.5 text-[11px] leading-relaxed text-kumtru-slate-500">
          {query.trim() && !channel
            ? "Enter a full username, email address or phone number."
            : channel
              ? `Searching by ${describeLookupChannel(channel)}.`
              : "Their username, email address or phone number."}
        </p>
      )}

      {lookup.isError ? (
        <p className="mt-2 text-xs text-kumtru-risk">
          {toErrorMessage(lookup.error, "We couldn't check that right now. Try again.")}
        </p>
      ) : null}

      {pending?.stage === "confirm" ? (
        <ConfirmCard
          party={pending.party}
          onYes={() => {
            onChange({ kind: "account", party: pending.party, label: partyLabel(pending.party) });
            setPending(null);
            lookup.reset();
          }}
          onNo={reset}
        />
      ) : null}

      {pending?.stage === "invite" ? (
        <div className="mt-2.5 rounded-kumtru-md border border-kumtru-warning/30 bg-kumtru-warning-soft p-3">
          <p className="text-xs leading-relaxed text-foreground">
            <b className="font-semibold">
              No Komtru account uses that{" "}
              {pending.channel === "EMAIL" ? "email address" : "phone number"}.
            </b>{" "}
            You can still start the trade and invite them — they will get a message on{" "}
            {inviteChannelLabel(pending.channel)}, and the invitation is tied to this trade so it
            can be traced back once they sign up and verify that{" "}
            {pending.channel === "EMAIL" ? "address" : "number"}.
          </p>

          {/* Inviting requires a handle on the *caller* — an invitee is told who
              invited them, and a publicId is not an answer to that. Said here
              rather than discovered as a 403, which would land after the trade
              has already been created. */}
          {!user?.username ? (
            <p className="mt-2 text-[11px] leading-relaxed text-kumtru-warning-on-soft">
              Choose your own username first — an invitation has to say who it came from.
            </p>
          ) : null}

          <div className="mt-2.5 flex gap-2">
            <Button
              type="button"
              size="sm"
              className="flex-1"
              onClick={() => {
                onChange({
                  kind: "invite",
                  channel: pending.channel,
                  destination: pending.destination,
                  label: pending.typed,
                });
                setPending(null);
                lookup.reset();
              }}
            >
              <UserPlus className="size-4" aria-hidden="true" />
              Invite {pending.typed}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={reset}>
              Try another
            </Button>
          </div>
        </div>
      ) : null}

      {pending?.stage === "no-account" ? (
        <SafetyCallout
          variant="warning"
          title={`No account matches that ${describeLookupChannel(pending.searched)}.`}
          className="mt-2.5"
        >
          {pending.searched === "USERNAME"
            ? "Check the spelling, or ask for their email address or phone number — those can carry an invitation, a username cannot."
            : "Check it over, or try one of their other details."}
          {pending.requiresCaptcha ? (
            <p className="mt-1.5">
              After several searches with no match, further ones may be blocked for a while — worth
              confirming the details with them before trying again.
            </p>
          ) : null}
        </SafetyCallout>
      ) : null}
    </div>
  );
}

/**
 * The one screen where the user is asked to look at a person and agree it is the
 * right one, so it shows what identifies them rather than a bare name: the
 * photo, the handle, how far they are verified, and how long they have been
 * here.
 *
 * `completedTransactions` is not shown. The API returns 0 for everybody until
 * its enricher is wired up, and "0 completed trades" beside a real account reads
 * as a warning about that person rather than a gap in our data.
 */
function ConfirmCard({
  party,
  onYes,
  onNo,
}: {
  party: PartyCard;
  onYes: () => void;
  onNo: () => void;
}) {
  const name = partyLabel(party);

  return (
    <div className="mt-2.5 rounded-kumtru-md border border-kumtru-blue/25 bg-kumtru-blue-soft p-3">
      <p className="text-[11px] font-semibold tracking-wide text-kumtru-info-on-soft uppercase">
        Is this the right person?
      </p>

      <div className="mt-2.5 flex items-center gap-3">
        <ProfileAvatar url={party.avatarUrl} name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          {party.username ? (
            <p className="truncate text-xs text-kumtru-slate-500">@{party.username}</p>
          ) : null}
          <p className="mt-0.5 text-[11px] text-kumtru-slate-500">
            On Komtru since {formatMemberSince(party.memberSince)}
          </p>
        </div>
      </div>

      <VerificationChip level={party.verificationLevel} className="mt-2.5" />

      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" className="flex-1" onClick={onYes}>
          <Check className="size-4" aria-hidden="true" />
          Yes, that&apos;s them
        </Button>
        <Button type="button" size="sm" variant="outline" className="flex-1" onClick={onNo}>
          <X className="size-4" aria-hidden="true" />
          No, search again
        </Button>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-[11px] font-semibold tracking-wide text-kumtru-slate-500 uppercase">
      {children}
    </Label>
  );
}

/**
 * `YYYY-MM-DD` to "August 2026". Month precision on purpose — the exact day an
 * account was created is not the caller's business, and a full date invites
 * reading significance into a coincidence.
 */
function formatMemberSince(value: string): string {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
