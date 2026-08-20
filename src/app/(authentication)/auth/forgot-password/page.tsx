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
import type { ForgotPasswordPayloadInterface } from "@/interfaces/auth";
import { useForgotPassword } from "@/services/auth.services";

const ForgotPasswordSchema = Yup.object({
  email: Yup.string().email("Enter a valid email address.").required("Email is required."),
});

export default function ForgotPasswordPage() {
  const { showToast } = useCustomToast();
  const { mutateAsync: forgotPassword } = useForgotPassword();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(
    values: ForgotPasswordPayloadInterface,
    { setSubmitting }: FormikHelpers<ForgotPasswordPayloadInterface>,
  ) {
    setError(null);

    try {
      await forgotPassword(values);
      setSentTo(values.email);
      showToast({ title: "Reset link sent", description: values.email, type: "success" });
    } catch (err) {
      const message = toErrorMessage(err, "We couldn't send that reset link. Try again shortly.");
      setError(message);
      showToast({ title: "Request failed", description: message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  if (sentTo) {
    return (
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-kumtru-success-soft">
          <MailCheck className="size-6 text-kumtru-success-on-soft" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-2xl font-semibold">Check your inbox</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-kumtru-slate-500">
          If an account exists for <b className="font-semibold text-foreground">{sentTo}</b>, a
          reset link is on its way. The link expires in 30 minutes.
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
        description="Tell us the email on your account and we'll send a reset link."
      />

      <Formik<ForgotPasswordPayloadInterface>
        initialValues={{ email: "" }}
        validationSchema={ForgotPasswordSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-5">
            <div>
              <Field name="email" type="email" as={FloatingLabelInput} label="Email" required />
              <ErrorMessage
                name="email"
                component="span"
                className="mt-1 block text-xs text-kumtru-risk"
              />
            </div>

            <FormError message={error} />

            <Button type="submit" size="xl" disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Spinner /> : "Send reset link"}
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
