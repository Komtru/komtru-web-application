"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, MessageCircle, MessageSquare } from "lucide-react";

import { FormError } from "@/components/forms/form-error";
import { SafetyCallout } from "@/components/general/safety-callout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Spinner } from "@/components/ui/spinner";
import {
  RESEND_LOCK_SECONDS,
  STEP_UP_FOR,
  checkCode,
  checkDestination,
  destinationOf,
  findPrimary,
  findRow,
  missingChannel,
} from "@/helpers/contact";
import { toErrorMessage } from "@/helpers/errors";
import { useCountdown } from "@/hooks/use-countdown";
import { useCustomToast } from "@/hooks/useCustomToast";
import type { ContactChannel, ContactChannelRow, OtpTransport } from "@/interfaces/auth";
import { authKeys, useBeginStepUp, useCompleteStepUp } from "@/services/auth.services";
import {
  contactKeys,
  useAddContact,
  useEmails,
  useMakeContactPrimary,
  usePhones,
  useResendContactCode,
  useVerifyContact,
} from "@/services/contact.services";
import { cn } from "@/lib/utils";

/**
 * Where the code goes on the phone channel — sent as `channel` on every request
 * that mints a phone OTP.
 *
 * SMS is rendered and disabled rather than hidden: a user who expects a text and
 * is not told otherwise waits for one that never comes. The selection is not
 * decorative — the API defaults this field to SMS, so a screen that says WhatsApp
 * while omitting it is a screen that lies.
 */
const TRANSPORTS: { value: OtpTransport; label: string; icon: typeof MessageCircle }[] = [
  { value: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
  { value: "SMS", label: "SMS", icon: MessageSquare },
];

const TRANSPORT_LABEL: Record<OtpTransport, string> = { WHATSAPP: "WhatsApp", SMS: "SMS" };

const COPY = {
  EMAIL: {
    field: "Email address",
    another: "Use a different address",
    hint: undefined,
  },
  PHONE: {
    field: "Phone number",
    another: "Use a different number",
    hint: "Include the country code, e.g. +234.",
  },
} as const satisfies Record<ContactChannel, unknown>;

type Phase = "destination" | "code" | "primary";

/**
 * Adding the second contact channel, end to end.
 *
 * The channel is not a prop: `ADD_SECOND_CHANNEL` says *a* channel is missing and
 * never which one, so this reads `/me/emails` and `/me/phones` and asks for the
 * side with no verified row. Deciding here rather than in the drawer keeps the
 * one network read next to the one screen that needs it, and means the prompt
 * cannot open a form for a channel the user already has.
 *
 * Three phases, because each one has a different irreversible cost: adding a
 * destination sends a code, verifying spends it, and promoting to primary
 * redirects every future security notice.
 */
export function AddChannelDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { showToast } = useCustomToast();

  // Only asked for while the dialog is open — these two responses are the user's
  // full addresses and numbers, and the shell around this has no use for them.
  const {
    data: emails,
    isLoading: loadingEmails,
    isError: emailsFailed,
    refetch: refetchEmails,
  } = useEmails(open);
  const {
    data: phones,
    isLoading: loadingPhones,
    isError: phonesFailed,
    refetch: refetchPhones,
  } = usePhones(open);

  const { mutateAsync: addContact, isPending: isAdding } = useAddContact();
  const { mutateAsync: verifyContact, isPending: isVerifying } = useVerifyContact();
  const { mutateAsync: resendCode, isPending: isResending } = useResendContactCode();
  const { mutateAsync: beginStepUp, isPending: isBeginningStepUp } = useBeginStepUp();
  const { mutateAsync: completeStepUp, isPending: isCompletingStepUp } = useCompleteStepUp();
  const { mutateAsync: makePrimary, isPending: isPromoting } = useMakeContactPrimary();

  const [channel, setChannel] = useState<ContactChannel | null>(null);
  const [decided, setDecided] = useState(false);

  const [phase, setPhase] = useState<Phase>("destination");
  const [destination, setDestination] = useState("");
  const [transport, setTransport] = useState<OtpTransport>("WHATSAPP");
  // Read back off the response rather than assumed from the request: the API
  // echoes the route it actually used, and that is what the copy should name.
  const [sentVia, setSentVia] = useState<OtpTransport | null>(null);
  const [contactId, setContactId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  // The primary-contact step is its own little step-up flow, with its own code.
  const [stepUpToken, setStepUpToken] = useState<string | null>(null);
  const [stepUpCode, setStepUpCode] = useState("");
  const [promoted, setPromoted] = useState(false);

  // Destructured rather than held as objects so the reset callbacks can be named
  // dependencies of the teardown effect below.
  const {
    secondsLeft: resendIn,
    isRunning: resendLocked,
    start: startResendLock,
    reset: resetResendLock,
  } = useCountdown();
  const {
    secondsLeft: stepUpIn,
    isRunning: stepUpLocked,
    start: startStepUpLock,
    reset: resetStepUpLock,
  } = useCountdown();

  /**
   * The channel is decided once and then frozen.
   *
   * Verifying the new channel makes both sides verified, so re-deriving it from
   * the lists on every render would flip the answer to `null` mid-flow and pull
   * the form out from under the user.
   */
  useEffect(() => {
    if (!open || decided || !emails || !phones) return;

    setChannel(missingChannel(emails, phones));
    setDecided(true);
  }, [open, decided, emails, phones]);

  // A closed dialog keeps no state: reopening it re-reads the lists, which may
  // have changed on another device, and a half-finished OTP is not resumable
  // anyway once its challenge has expired.
  useEffect(() => {
    if (open) return;

    setChannel(null);
    setDecided(false);
    setPhase("destination");
    setDestination("");
    setTransport("WHATSAPP");
    setSentVia(null);
    setContactId(null);
    setChallengeId(null);
    setCode("");
    setError(null);
    setStepUpToken(null);
    setStepUpCode("");
    setPromoted(false);
    resetResendLock();
    resetStepUpLock();
  }, [open, resetResendLock, resetStepUpLock]);

  const rows: ContactChannelRow[] =
    channel === "EMAIL" ? (emails ?? []) : channel === "PHONE" ? (phones ?? []) : [];
  const createdRow = findRow(rows, contactId);
  const currentPrimary = findPrimary(rows);

  /**
   * Verifying the first channel of a kind makes it primary automatically, so
   * there is frequently nothing left to promote. Reading the row rather than
   * assuming it avoids walking the user through a step-up for a change the API
   * has already made.
   */
  const alreadyPrimary = createdRow?.isPrimary === true;
  const copy = channel ? COPY[channel] : null;

  async function handleSendCode() {
    if (!channel) return;

    const invalid = checkDestination(channel, destination);
    if (invalid) {
      setError(invalid);
      return;
    }

    setError(null);

    try {
      // `transport` is only meaningful on the phone channel, and the service
      // drops it for email rather than making every caller remember that.
      const result = await addContact({ channel, destination: destination.trim(), transport });

      setContactId(result.id);
      setChallengeId(result.challengeId);
      setSentVia(result.channel ?? transport);
      setCode("");
      setPhase("code");
      startResendLock(RESEND_LOCK_SECONDS[channel]);
    } catch (err) {
      // A 409 here is the interesting one: the destination is already verified on
      // another account, which is a different problem from a typo.
      setError(toErrorMessage(err, "We couldn't send a code to that destination."));
    }
  }

  async function handleResend() {
    if (!channel || !contactId) return;

    setError(null);

    try {
      const result = await resendCode({ channel, id: contactId, transport });

      // The new challenge replaces the old one — the API consumed it when it
      // minted this. Keeping the previous id would fail the very next verify.
      setChallengeId(result.challengeId);
      setSentVia(result.channel ?? transport);
      setCode("");
      startResendLock(RESEND_LOCK_SECONDS[channel]);
      showToast({ title: "Code sent again", type: "info" });
    } catch (err) {
      // Usually the 3-per-10-minutes cap, and its message names the wait. The
      // lock is restarted either way so the button cannot be hammered.
      setError(toErrorMessage(err, "We couldn't send another code just yet."));
      startResendLock(RESEND_LOCK_SECONDS[channel]);
    }
  }

  async function handleVerify() {
    if (!channel || !contactId || !challengeId) return;

    const invalid = checkCode(code);
    if (invalid) {
      setError(invalid);
      return;
    }

    setError(null);

    try {
      await verifyContact({ channel, id: contactId, challengeId, code: code.trim() });

      // Both matter: the list drives the primary decision below, and `GET /me`
      // recomputes `nextStep` and `verificationLevel` — which is what takes the
      // prompt out of the drawer.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: contactKeys.all }),
        queryClient.invalidateQueries({ queryKey: authKeys.me() }),
      ]);

      resetResendLock();
      setPhase("primary");
      showToast({
        title: channel === "EMAIL" ? "Email verified" : "Number verified",
        type: "success",
      });
    } catch (err) {
      setError(toErrorMessage(err, "That code is not valid or has expired."));
    }
  }

  /** Opens the step-up challenge that promoting a channel requires. */
  async function handleBeginPromotion() {
    if (!channel) return;

    setError(null);

    try {
      const challenge = await beginStepUp(STEP_UP_FOR[channel]);

      setStepUpToken(challenge.stepUpToken);
      setStepUpCode("");
      startStepUpLock(RESEND_LOCK_SECONDS[channel]);
    } catch (err) {
      setError(toErrorMessage(err, "We couldn't start that change."));
    }
  }

  async function handleConfirmPromotion() {
    if (!channel || !contactId || !stepUpToken) return;

    const invalid = checkCode(stepUpCode);
    if (invalid) {
      setError(invalid);
      return;
    }

    setError(null);

    try {
      await completeStepUp({ stepUpToken, proof: stepUpCode.trim() });
      await makePrimary({ channel, id: contactId, stepUpToken });

      await queryClient.invalidateQueries({ queryKey: contactKeys.all });

      setPromoted(true);
      setStepUpToken(null);
      resetStepUpLock();
      showToast({ title: "Primary contact updated", type: "success" });
    } catch (err) {
      // The token is spent by whichever half failed, so the next attempt has to
      // start a fresh challenge rather than reuse this one.
      setStepUpToken(null);
      resetStepUpLock();
      setError(toErrorMessage(err, "We couldn't make that your primary contact."));
    }
  }

  const cannotDecide = !decided && (emailsFailed || phonesFailed);

  function renderHeader() {
    if (cannotDecide) {
      return {
        title: "We couldn't check",
        description:
          "Reading the channels already on your account failed, and asking for the wrong one would only waste a code.",
      };
    }

    if (!decided) return { title: "One moment", description: "Checking what's on your account." };

    if (!channel) {
      return {
        title: "You're all set",
        description: "Both an email address and a phone number are verified on this account.",
      };
    }

    if (phase === "primary") {
      return {
        title: channel === "EMAIL" ? "Email address confirmed" : "Phone number confirmed",
        description: "Both channels are verified, so you can fund and release a trade.",
      };
    }

    if (phase === "code") {
      const via = sentVia ? ` on ${TRANSPORT_LABEL[sentVia]}` : "";

      return {
        title: "Enter your code",
        description: `We sent a six-digit code to ${destination.trim()}${via}. It expires in five minutes.`,
      };
    }

    return {
      title: channel === "EMAIL" ? "Add your email address" : "Add your phone number",
      description:
        "A verified email and phone are what unlock funding a trade — and what we use to reach you if one goes wrong.",
    };
  }

  const header = renderHeader();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* `sm:max-w-[420px]` rather than a bare `max-w`: the base class it would
          have to beat is itself a `sm:` variant, and this app is a phone-width
          column on every screen. */}
      <DialogContent className="gap-5 sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{header.title}</DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">
            {header.description}
          </DialogDescription>
        </DialogHeader>

        {!decided && !cannotDecide && (loadingEmails || loadingPhones) ? (
          <div className="flex justify-center py-6">
            <Spinner size="lg" className="text-kumtru-blue" />
          </div>
        ) : null}

        {cannotDecide ? (
          <Button
            size="xl"
            className="w-full"
            onClick={() => {
              void refetchEmails();
              void refetchPhones();
            }}
          >
            Try again
          </Button>
        ) : null}

        {decided && !channel ? (
          <Button size="xl" className="w-full" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        ) : null}

        {channel && copy && phase !== "primary" ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void (phase === "destination" ? handleSendCode() : handleVerify());
            }}
          >
            <div>
              <FloatingLabelInput
                label={copy.field}
                type={channel === "EMAIL" ? "email" : "tel"}
                inputMode={channel === "EMAIL" ? "email" : "tel"}
                autoComplete={channel === "EMAIL" ? "email" : "tel"}
                autoCapitalize="none"
                autoFocus
                required
                // Locked once a code is out: the challenge is bound to the row
                // the API created for this exact destination, so editing the
                // field would leave the code and the number describing different
                // things.
                disabled={phase === "code"}
                hint={phase === "destination" ? copy.hint : undefined}
                value={destination}
                onChange={(event) => {
                  setDestination(event.target.value);
                  setError(null);
                }}
              />
            </div>

            {channel === "PHONE" ? (
              <div>
                <div
                  role="radiogroup"
                  aria-label="Send the code by"
                  className="flex rounded-kumtru-sm bg-secondary p-1"
                >
                  {TRANSPORTS.map((option) => {
                    const unavailable = option.value === "SMS";

                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={transport === option.value}
                        disabled={unavailable || phase === "code"}
                        onClick={() => setTransport(option.value)}
                        className={cn(
                          "flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[13px] font-semibold transition-colors",
                          transport === option.value
                            ? "bg-card text-foreground shadow-sm"
                            : "text-kumtru-slate-500",
                          unavailable && "cursor-not-allowed opacity-40",
                        )}
                      >
                        <option.icon className="size-3.5" aria-hidden="true" />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-xs text-kumtru-slate-500">
                  Codes go out on WhatsApp for now — SMS isn&apos;t available yet.
                </p>
              </div>
            ) : null}

            {phase === "code" ? (
              <div>
                <FloatingLabelInput
                  label="6-digit code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  autoFocus
                  className="font-mono text-lg tracking-[0.3em]"
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value.replace(/\D/g, ""));
                    setError(null);
                  }}
                />

                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-kumtru-slate-500" role="status" aria-live="polite">
                    {resendLocked ? `You can ask for another in ${resendIn}s` : "Didn't get it?"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={resendLocked || isResending}
                    onClick={() => void handleResend()}
                  >
                    {isResending ? <Spinner /> : "Resend code"}
                  </Button>
                </div>
              </div>
            ) : null}

            <FormError message={error} />

            <Button
              type="submit"
              size="xl"
              className="w-full"
              disabled={isAdding || isVerifying}
              aria-busy={isAdding || isVerifying}
            >
              {isAdding || isVerifying ? (
                <Spinner />
              ) : phase === "destination" ? (
                "Send code"
              ) : (
                "Verify and continue"
              )}
            </Button>

            {phase === "code" ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setPhase("destination");
                  setCode("");
                  setChallengeId(null);
                  setError(null);
                  resetResendLock();
                }}
              >
                {copy.another}
              </Button>
            ) : null}

            <SafetyCallout title="Never read a code out to anyone.">
              Komtru staff will not ask for it, and nobody needs it to pay you or to release a
              trade.
            </SafetyCallout>
          </form>
        ) : null}

        {channel && phase === "primary" ? (
          <div className="space-y-4">
            <p className="flex items-start gap-2 text-[13px] leading-relaxed text-kumtru-success-on-soft">
              <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                {createdRow ? destinationOf(createdRow) : destination.trim()} is verified on your
                account.
              </span>
            </p>

            {promoted || alreadyPrimary ? (
              <SafetyCallout variant="protected" title="This is your primary contact.">
                Trade alerts, receipts and security notices go here first.
              </SafetyCallout>
            ) : (
              <>
                <SafetyCallout variant="info" title="Make this your primary contact?">
                  Your primary {channel === "EMAIL" ? "address" : "number"} is where trade alerts,
                  receipts and security notices land first. It is currently{" "}
                  <b className="font-semibold">{currentPrimary?.masked ?? "unset"}</b>.
                </SafetyCallout>

                {stepUpToken ? (
                  <form
                    className="space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleConfirmPromotion();
                    }}
                  >
                    <FloatingLabelInput
                      label="Confirmation code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      required
                      autoFocus
                      className="font-mono text-lg tracking-[0.3em]"
                      value={stepUpCode}
                      onChange={(event) => {
                        setStepUpCode(event.target.value.replace(/\D/g, ""));
                        setError(null);
                      }}
                      // Not the channel being promoted: a step-up code always goes
                      // to the account's current primary, which is the point —
                      // the address losing the role is the one that authorises it.
                      hint={`Sent to ${currentPrimary?.masked ?? "your primary contact"}.`}
                    />

                    <FormError message={error} />

                    <Button
                      type="submit"
                      size="xl"
                      className="w-full"
                      disabled={isCompletingStepUp || isPromoting}
                      aria-busy={isCompletingStepUp || isPromoting}
                    >
                      {isCompletingStepUp || isPromoting ? <Spinner /> : "Confirm and make primary"}
                    </Button>

                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs text-kumtru-slate-500"
                        role="status"
                        aria-live="polite"
                      >
                        {stepUpLocked
                          ? `You can ask for another in ${stepUpIn}s`
                          : "Didn't get it?"}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={stepUpLocked || isBeginningStepUp}
                        onClick={() => void handleBeginPromotion()}
                      >
                        {isBeginningStepUp ? <Spinner /> : "Send another"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <FormError message={error} />
                    <Button
                      size="xl"
                      className="w-full"
                      disabled={isBeginningStepUp}
                      aria-busy={isBeginningStepUp}
                      onClick={() => void handleBeginPromotion()}
                    >
                      {isBeginningStepUp ? <Spinner /> : "Make it my primary contact"}
                    </Button>
                  </>
                )}
              </>
            )}

            <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
              {promoted || alreadyPrimary ? "Done" : "Not now"}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
