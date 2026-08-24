"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorMessage, Field, Form, Formik, type FormikHelpers } from "formik";
import * as Yup from "yup";

import { AuthHeading } from "@/components/forms/auth-heading";
import { FormError } from "@/components/forms/form-error";
import { Button } from "@/components/ui/button";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Spinner } from "@/components/ui/spinner";
import {
  HOME_ROUTE,
  clearMfaChallenge,
  readMfaChallenge,
  type PendingMfaChallenge,
} from "@/helpers/auth";
import { toErrorMessage } from "@/helpers/errors";
import { useCustomToast } from "@/hooks/useCustomToast";
import { isMfaChallenge, type FactorHint, type FactorType } from "@/interfaces/auth";
import { useMfaVerify } from "@/services/auth.services";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";

interface ChallengeFormValues {
  code: string;
}

/** Recovery codes are longer than six digits, so this cannot demand exactly six. */
const ChallengeSchema = Yup.object({
  code: Yup.string().trim().min(6, "That code is too short.").required("Enter your code."),
});

const FACTOR_COPY: Record<FactorType, string> = {
  TOTP: "Enter the current code from your authenticator app.",
  SMS_OTP: "Enter the code we sent by SMS.",
  EMAIL_OTP: "Enter the code we emailed you.",
  PASSKEY: "Use your passkey to continue.",
  RECOVERY_CODE: "Enter one of your recovery codes.",
};

function factorLabel(factor: FactorHint): string {
  return factor.hint || factor.type;
}

function TwoFactorChallenge({ challenge }: { challenge: PendingMfaChallenge }) {
  const router = useRouter();
  const { showToast } = useCustomToast();
  const { mutateAsync: verify } = useMfaVerify();
  const startSession = useAuthStore((state) => state.startSession);

  const [error, setError] = useState<string | null>(null);
  const [factorId, setFactorId] = useState(
    () => (challenge.factors.find((factor) => factor.isDefault) ?? challenge.factors[0])?.id ?? "",
  );

  const selected = challenge.factors.find((factor) => factor.id === factorId);

  async function handleSubmit(
    values: ChallengeFormValues,
    { setSubmitting }: FormikHelpers<ChallengeFormValues>,
  ) {
    setError(null);

    try {
      const result = await verify({
        mfaToken: challenge.mfaToken,
        factorId,
        code: values.code.trim(),
      });

      // The API reuses one response shape for both login legs, so in principle
      // this branch exists. In practice a completed second factor never asks for
      // another — treating it as an error is more honest than pretending.
      if (isMfaChallenge(result)) {
        setError("That factor could not complete the sign-in. Start again.");
        return;
      }

      clearMfaChallenge();
      startSession(result);
      showToast({ title: "Verified", type: "success" });
      router.replace(HOME_ROUTE);
    } catch (err) {
      const message = toErrorMessage(err, "That code didn't work. Check it and try again.");
      setError(message);
      showToast({ title: "Verification failed", description: message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <AuthHeading
        title="Two-step verification"
        description={
          <>
            {selected
              ? FACTOR_COPY[selected.type]
              : "Enter your second factor to finish signing in."}
            {challenge.identifier ? (
              <>
                {" "}
                Signing in as{" "}
                <b className="font-semibold text-foreground">{challenge.identifier}</b>.
              </>
            ) : null}
          </>
        }
      />

      {challenge.factors.length > 1 ? (
        <div className="mb-4 space-y-2">
          <p className="text-[11px] font-semibold tracking-wide text-kumtru-slate-500 uppercase">
            Verify with
          </p>
          <div className="flex flex-wrap gap-2">
            {challenge.factors.map((factor) => (
              <button
                key={factor.id}
                type="button"
                onClick={() => setFactorId(factor.id)}
                aria-pressed={factor.id === factorId}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  factor.id === factorId
                    ? "border-kumtru-blue bg-kumtru-blue/10 text-kumtru-blue"
                    : "border-border text-kumtru-slate-500",
                )}
              >
                {factorLabel(factor)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <Formik<ChallengeFormValues>
        initialValues={{ code: "" }}
        validationSchema={ChallengeSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-5">
            <div>
              <Field
                name="code"
                as={FloatingLabelInput}
                label="Verification code"
                inputMode={selected?.type === "RECOVERY_CODE" ? "text" : "numeric"}
                autoComplete="one-time-code"
                maxLength={20}
                required
                className="font-mono text-lg tracking-[0.2em]"
              />
              <ErrorMessage
                name="code"
                component="span"
                className="mt-1 block text-xs text-kumtru-risk"
              />
            </div>

            <FormError message={error} />

            <Button type="submit" size="xl" disabled={isSubmitting || !factorId} className="w-full">
              {isSubmitting ? <Spinner /> : "Verify and continue"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                clearMfaChallenge();
                router.replace("/auth/login");
              }}
            >
              Cancel and sign in again
            </Button>
          </Form>
        )}
      </Formik>
    </div>
  );
}

export default function TwoFactorPage() {
  const router = useRouter();
  const [challenge, setChallenge] = useState<PendingMfaChallenge | null | undefined>(undefined);

  // Read after mount: `sessionStorage` does not exist during the server render,
  // and reading it in a `useState` initialiser would produce a hydration
  // mismatch on the very first paint.
  useEffect(() => {
    const pending = readMfaChallenge();
    setChallenge(pending);
    if (!pending) router.replace("/auth/login");
  }, [router]);

  if (!challenge) return <Spinner size="lg" className="mx-auto text-kumtru-blue" />;

  return <TwoFactorChallenge challenge={challenge} />;
}
