"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ErrorMessage, Field, Form, Formik, type FormikHelpers } from "formik";
import * as Yup from "yup";

import { AuthHeading } from "@/components/forms/auth-heading";
import { FormError } from "@/components/forms/form-error";
import { Button } from "@/components/ui/button";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Spinner } from "@/components/ui/spinner";
import { toErrorMessage } from "@/helpers/errors";
import { useCustomToast } from "@/hooks/useCustomToast";
import { TwoFactorMethodEnum } from "@/interfaces/auth";
import { useResendLogin2FA, useVerifyLogin2FA } from "@/services/auth.services";
import { useAuthStore } from "@/store/auth.store";

const RESEND_COOLDOWN_SECONDS = 45;

interface ChallengeFormValues {
  code: string;
}

const ChallengeSchema = Yup.object({
  code: Yup.string()
    .matches(/^\d{6}$/, "Enter the 6-digit code.")
    .required("Enter the 6-digit code."),
});

function methodCopy(method: string | null) {
  if (method === TwoFactorMethodEnum.EMAIL) {
    return "Enter the 6-digit code we emailed you.";
  }
  return "Enter the 6-digit code from your authenticator app.";
}

function TwoFactorChallenge() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get("challenge");
  const email = searchParams.get("email");
  const method = searchParams.get("method");

  const { showToast } = useCustomToast();
  const { mutateAsync: verify } = useVerifyLogin2FA();
  const { mutateAsync: resend, isPending: isResending } = useResendLogin2FA();
  const initUserStore = useAuthStore((state) => state.initUserStore);

  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // A challenge cannot be completed without its id — send the user back rather
  // than showing a form that can only fail.
  useEffect(() => {
    if (!challengeId) router.replace("/auth/login");
  }, [challengeId, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleSubmit(
    values: ChallengeFormValues,
    { setSubmitting }: FormikHelpers<ChallengeFormValues>,
  ) {
    if (!challengeId) return;
    setError(null);

    try {
      const result = await verify({ challengeId, code: values.code });

      initUserStore({
        auth: result.auth,
        user: result.user,
        tokens: result.tokens,
      });

      showToast({ title: "Verified", type: "success" });
      router.replace("/trades");
    } catch (err) {
      const message = toErrorMessage(err, "That code didn't work. Check it and try again.");
      setError(message);
      showToast({ title: "Verification failed", description: message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!challengeId || cooldown > 0) return;
    setError(null);

    try {
      await resend({ challengeId });
      setCooldown(RESEND_COOLDOWN_SECONDS);
      showToast({ title: "New code sent", type: "success" });
    } catch (err) {
      const message = toErrorMessage(err, "We couldn't send a new code. Try again shortly.");
      setError(message);
      showToast({ title: "Resend failed", description: message, type: "error" });
    }
  }

  if (!challengeId) {
    return <Spinner size="lg" className="mx-auto text-kumtru-blue" />;
  }

  return (
    <div>
      <AuthHeading
        title="Two-step verification"
        description={
          <>
            {methodCopy(method)}
            {email ? (
              <>
                {" "}
                Signing in as <b className="font-semibold text-foreground">{email}</b>.
              </>
            ) : null}
          </>
        }
      />

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

            {method === TwoFactorMethodEnum.EMAIL ? (
              <Button
                type="button"
                variant="ghost"
                onClick={handleResend}
                disabled={isResending || cooldown > 0}
                className="w-full"
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Send a new code"}
              </Button>
            ) : null}
          </Form>
        )}
      </Formik>
    </div>
  );
}

export default function TwoFactorPage() {
  return (
    <Suspense fallback={<Spinner size="lg" className="mx-auto text-kumtru-blue" />}>
      <TwoFactorChallenge />
    </Suspense>
  );
}
