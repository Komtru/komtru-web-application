"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ErrorMessage, Field, Form, Formik, type FormikHelpers } from "formik";
import * as Yup from "yup";

import { AuthHeading } from "@/components/forms/auth-heading";
import { FormError } from "@/components/forms/form-error";
import { SafetyCallout } from "@/components/general/safety-callout";
import { Button } from "@/components/ui/button";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Spinner } from "@/components/ui/spinner";
import { HOME_ROUTE, PLATFORM, deviceFingerprint } from "@/helpers/auth";
import { toErrorMessage } from "@/helpers/errors";
import { useCustomToast } from "@/hooks/useCustomToast";
import type { SessionResult } from "@/interfaces/auth";
import { useVerifyOtp } from "@/services/auth.services";
import { useAuthStore } from "@/store/auth.store";

interface VerifyFormValues {
  code: string;
}

const VerifySchema = Yup.object({
  code: Yup.string()
    .matches(/^\d{6}$/, "A code is six digits.")
    .required("Enter the 6-digit code."),
});

/**
 * Proving control of the channel, with a code.
 *
 * Not a click-through link: only entering the code proves the person holding the
 * inbox is the person at the keyboard, which is what stops a forwarded
 * invitation putting the wrong party into a trade.
 */
function VerifyChannel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get("challenge");
  const channel = searchParams.get("channel") === "PHONE" ? "PHONE" : "EMAIL";
  const destination = searchParams.get("to");

  const { showToast } = useCustomToast();
  const { mutateAsync: verifyOtp } = useVerifyOtp();
  const startSession = useAuthStore((state) => state.startSession);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(
    values: VerifyFormValues,
    { setSubmitting }: FormikHelpers<VerifyFormValues>,
  ) {
    if (!challengeId) return;
    setError(null);

    try {
      const result = await verifyOtp({
        challengeId,
        code: values.code,
        deviceFingerprint: deviceFingerprint(),
        platform: PLATFORM,
      });

      // Verifying the first channel activates the account, so this response
      // carries a session. Guarded rather than assumed: the tokens are optional
      // on the type because a later channel verification returns none.
      if (result.accessToken && result.refreshToken && result.expiresIn) {
        startSession({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
          tokenType: "Bearer",
          user: result.user,
          nextStep: result.nextStep,
        } satisfies SessionResult);

        showToast({ title: "You're verified", type: "success" });
        router.replace(HOME_ROUTE);
        return;
      }

      showToast({ title: "Verified", description: "Sign in to continue.", type: "success" });
      router.replace("/auth/login");
    } catch (err) {
      const message = toErrorMessage(err, "That code is not valid or has expired.");
      setError(message);
      showToast({ title: "Verification failed", description: message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  if (!challengeId) {
    return (
      <div>
        <AuthHeading
          title="Nothing to verify"
          description="This page needs the challenge from a signup that has just started. Create your account to get a fresh code."
        />
        <Button asChild size="xl" className="w-full">
          <Link href="/auth/register">Create an account</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <AuthHeading
        title={channel === "PHONE" ? "Confirm your number" : "Confirm your email"}
        description={
          <>
            Enter the six-digit code we sent
            {destination ? (
              <>
                {" to "}
                <b className="font-semibold text-foreground">{destination}</b>
              </>
            ) : null}
            .
          </>
        }
      />

      <Formik<VerifyFormValues>
        initialValues={{ code: "" }}
        validationSchema={VerifySchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-5">
            <div>
              <Field
                name="code"
                as={FloatingLabelInput}
                label="6-digit code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                className="font-mono text-lg tracking-[0.3em]"
              />
              <ErrorMessage
                name="code"
                component="span"
                className="mt-1 block text-xs text-kumtru-risk"
              />
            </div>

            <FormError message={error} />

            <Button type="submit" size="xl" disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Spinner /> : "Verify and continue"}
            </Button>

            {/* No resend button: there is no public endpoint to reissue a
                registration challenge, and a button that cannot work is worse
                than none. Starting again issues a fresh code. */}
            <Button asChild variant="ghost" className="w-full">
              <Link href="/auth/register">
                Use a different {channel === "PHONE" ? "number" : "address"}
              </Link>
            </Button>
          </Form>
        )}
      </Formik>

      <SafetyCallout className="mt-6" title="Never read a code out to anyone.">
        Komtru staff will not ask for it, and nobody needs it to pay you or to release a trade.
      </SafetyCallout>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<Spinner size="lg" className="mx-auto text-kumtru-blue" />}>
      <VerifyChannel />
    </Suspense>
  );
}
