"use client";

import { useState } from "react";
import Link from "next/link";
import { ErrorMessage, Field, Form, Formik, type FormikHelpers } from "formik";
import { MailCheck } from "lucide-react";
import * as Yup from "yup";

import { AuthHeading } from "@/components/forms/auth-heading";
import { FormError } from "@/components/forms/form-error";
import { Button } from "@/components/ui/button";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Spinner } from "@/components/ui/spinner";
import { toErrorMessage } from "@/helpers/errors";
import { useCustomToast } from "@/hooks/useCustomToast";
import type { ForgotPasswordPayload } from "@/interfaces/auth";
import { useForgotPassword } from "@/services/auth.services";

const ForgotPasswordSchema = Yup.object({
  identifier: Yup.string().trim().required("Enter your email, phone number or username."),
});

export default function ForgotPasswordPage() {
  const { showToast } = useCustomToast();
  const { mutateAsync: forgotPassword } = useForgotPassword();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(
    values: ForgotPasswordPayload,
    { setSubmitting }: FormikHelpers<ForgotPasswordPayload>,
  ) {
    setError(null);

    try {
      await forgotPassword({ identifier: values.identifier.trim() });
      setSubmitted(true);
    } catch (err) {
      const message = toErrorMessage(err, "We couldn't send that reset link. Try again shortly.");
      setError(message);
      showToast({ title: "Request failed", description: message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-kumtru-success-soft">
          <MailCheck className="size-6 text-kumtru-success-on-soft" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-2xl font-semibold">Check your messages</h2>
        {/* Deliberately says nothing about whether that account exists — the API
            answers identically either way, and copy that implied otherwise would
            hand back the answer the endpoint withholds. */}
        <p className="mt-2 text-[13px] leading-relaxed text-kumtru-slate-500">
          If that account exists, reset instructions are on their way to its verified contact
          channel.
        </p>
        <Button asChild variant="secondary" size="xl" className="mt-6 w-full">
          <Link href="/auth/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <AuthHeading
        title="Reset your password"
        description="Tell us how you sign in and we'll send instructions to your verified contact channel."
      />

      <Formik<ForgotPasswordPayload>
        initialValues={{ identifier: "" }}
        validationSchema={ForgotPasswordSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-5">
            <div>
              <Field
                name="identifier"
                as={FloatingLabelInput}
                label="Email, phone or username"
                autoComplete="username"
                autoCapitalize="none"
                required
              />
              <ErrorMessage
                name="identifier"
                component="span"
                className="mt-1 block text-xs text-kumtru-risk"
              />
            </div>

            <FormError message={error} />

            <Button type="submit" size="xl" disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Spinner /> : "Send reset instructions"}
            </Button>

            <p className="text-center text-xs text-kumtru-slate-500">
              Remembered it?{" "}
              <Link href="/auth/login" className="font-semibold text-kumtru-blue hover:underline">
                Sign in
              </Link>
            </p>
          </Form>
        )}
      </Formik>
    </div>
  );
}
