"use client";

import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, CircleAlert, X } from "lucide-react";
import { useDebounce } from "use-debounce";

import { BrandLockup } from "@/components/general/brand-mark";
import { FormError } from "@/components/forms/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toErrorMessage } from "@/helpers/errors";
import { useCustomToast } from "@/hooks/useCustomToast";
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  type UsernameRejection,
} from "@/interfaces/auth";
import { authKeys } from "@/services/auth.services";
import {
  checkUsernameFormat,
  useClaimUsername,
  useUsernameAvailability,
} from "@/services/username.services";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";

/**
 * The availability endpoint allows 20 checks per minute per actor. Long enough
 * that a normal typist produces one check per handle rather than one per letter.
 */
const DEBOUNCE_MS = 450;

const REASON_COPY: Record<UsernameRejection, string> = {
  TOO_SHORT: `At least ${USERNAME_MIN_LENGTH} characters.`,
  TOO_LONG: `At most ${USERNAME_MAX_LENGTH} characters.`,
  INVALID_FORMAT:
    "Start with a letter and end with a letter or number. Dots and underscores can sit between them, but never side by side.",
  RESERVED: "That handle is reserved.",
  TAKEN: "That handle is already taken.",
  // Worth spelling out rather than calling it "taken": the point of the rule is
  // the reason this app exists.
  CONFUSABLE_WITH_EXISTING:
    "Too close to an existing handle. Near-misses are how buyers end up paying the wrong person.",
  QUARANTINED: "Recently given up by someone else, and on hold for 90 days.",
  BLOCKED_TERM: "That handle contains a term we don't allow.",
};

/** Uppercase and whitespace are never valid, so they are corrected rather than rejected. */
function normalise(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, "");
}

function StatusLine({ tone, children }: { tone: "pending" | "good" | "bad"; children: ReactNode }) {
  const Icon = tone === "good" ? Check : tone === "bad" ? X : null;

  return (
    <p
      role="status"
      aria-live="polite"
      className={cn(
        "mt-2 flex items-start gap-1.5 text-xs leading-relaxed",
        tone === "good" && "text-kumtru-success-on-soft",
        tone === "bad" && "text-kumtru-risk",
        tone === "pending" && "text-kumtru-slate-500",
      )}
    >
      {tone === "pending" ? (
        <Spinner className="mt-0.5 size-3 shrink-0" />
      ) : Icon ? (
        <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      ) : null}
      <span>{children}</span>
    </p>
  );
}

/**
 * Onboarding's blocking step: claim a handle.
 *
 * Rendered *instead of* the app shell, not as a route inside it — there is no
 * tab bar and no drawer to tap past, because "force" and "redirect to a page
 * with working navigation" are different things.
 *
 * Only `CHOOSE_USERNAME` blocks. `ADD_SECOND_CHANNEL` and `SET_PASSWORD` are
 * also `nextStep` values, but the API is explicit that a user with one verified
 * channel can browse and buy — so those are prompts in the drawer, not gates.
 */
export function UsernameGate() {
  const queryClient = useQueryClient();
  const { showToast } = useCustomToast();

  const setUser = useAuthStore((state) => state.setUser);
  const setNextStep = useAuthStore((state) => state.setNextStep);
  const user = useAuthStore((state) => state.user);

  const [candidate, setCandidate] = useState("");
  const [debounced] = useDebounce(candidate, DEBOUNCE_MS);
  const [error, setError] = useState<string | null>(null);

  const format = checkUsernameFormat(candidate);
  const debouncedFormat = checkUsernameFormat(debounced);

  const {
    data: availability,
    isFetching,
    isError,
  } = useUsernameAvailability(debounced, debouncedFormat.ok);

  const { mutateAsync: claim, isPending: isClaiming } = useClaimUsername();

  // The verdict on screen must describe what is *in the field*, not the last
  // string that finished checking — otherwise a stale "Available" sits under a
  // handle the user has since edited, and the submit button lies.
  const settled = debounced === candidate && !isFetching;
  const available = settled && format.ok && availability?.available === true;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!available || isClaiming) return;

    setError(null);

    try {
      const result = await claim({ username: candidate });

      setNextStep(null);
      if (user) setUser({ ...user, username: result.username });
      await queryClient.invalidateQueries({ queryKey: authKeys.me() });

      showToast({ title: `You're @${result.username}`, type: "success" });
    } catch (err) {
      // The API re-checks availability inside its own transaction, so a 409 here
      // means someone claimed it in the gap. Re-running the check is what turns
      // that into a usable answer rather than a dead button.
      setError(toErrorMessage(err, "We couldn't claim that handle. Try another."));
      await queryClient.invalidateQueries({ queryKey: ["usernames"] });
    }
  }

  function renderStatus() {
    if (candidate.length === 0) return null;

    if (!format.ok) {
      return <StatusLine tone="bad">{REASON_COPY[format.reason ?? "INVALID_FORMAT"]}</StatusLine>;
    }

    if (!settled) return <StatusLine tone="pending">Checking @{candidate}…</StatusLine>;

    if (isError) {
      return (
        <StatusLine tone="bad">
          We couldn&apos;t check that one — you may be checking too fast. Wait a moment and try
          again.
        </StatusLine>
      );
    }

    if (availability?.available)
      return <StatusLine tone="good">@{candidate} is available.</StatusLine>;

    return <StatusLine tone="bad">{REASON_COPY[availability?.reason ?? "TAKEN"]}</StatusLine>;
  }

  const suggestions = settled && !availability?.available ? (availability?.suggestions ?? []) : [];

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-center border-b border-border bg-card px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <BrandLockup className="text-sm" />
      </header>

      <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-5 pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <h1 className="text-2xl font-semibold">Choose your username</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-kumtru-slate-500">
          This is how a counterparty tags you into a trade, and how they confirm they are dealing
          with you and not someone imitating you. You can browse without one, but nothing else.
        </p>

        <form onSubmit={handleSubmit} className="mt-7">
          <label htmlFor="username" className="text-[11px] font-semibold tracking-wide uppercase">
            Username
          </label>

          <div className="relative mt-1.5">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[15px] font-semibold text-kumtru-slate-400"
            >
              @
            </span>
            <Input
              id="username"
              value={candidate}
              onChange={(event) => {
                setCandidate(normalise(event.target.value));
                setError(null);
              }}
              maxLength={USERNAME_MAX_LENGTH}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              autoFocus
              placeholder="yourname"
              aria-describedby="username-status"
              className={cn(
                "h-14 ps-8 pe-11 text-[15px] md:text-[15px]",
                candidate.length > 0 && settled && format.ok
                  ? available
                    ? "border-kumtru-success"
                    : "border-kumtru-risk"
                  : undefined,
              )}
            />
            {candidate.length > 0 && !settled ? (
              <Spinner className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-kumtru-slate-400" />
            ) : null}
          </div>

          <div id="username-status">{renderStatus()}</div>

          {suggestions.length > 0 ? (
            <div className="mt-3">
              <p className="text-[11px] font-semibold text-kumtru-slate-500">Available instead</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {/* Every suggestion is pre-verified as claimable by the API, so
                    tapping one lands on a handle that will not bounce. */}
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setCandidate(suggestion)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-kumtru-slate-600 active:bg-secondary"
                  >
                    @{suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <FormError message={error} />

          <Button
            type="submit"
            size="xl"
            disabled={!available || isClaiming}
            className="mt-6 w-full"
          >
            {isClaiming ? <Spinner /> : "Claim and continue"}
          </Button>
        </form>

        <p className="mt-5 flex items-start gap-2 text-[11px] leading-relaxed text-kumtru-slate-500">
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {/* Not a scare note — it is the reason the change rules exist, and
              knowing it up front is what stops the support ticket later. */}
          <span>
            Changing a handle later is limited: three times in the account&apos;s life, once every
            30 days, and never while a trade is live. Pick one you will keep.
          </span>
        </p>
      </div>
    </div>
  );
}
