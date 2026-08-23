"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
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
import { PASSWORD_MIN_LENGTH } from "@/interfaces/auth";
import { useResetPassword } from "@/services/auth.services";
import { clearPersistedSession } from "@/store/auth.store";

interface ResetFormValues {
  newPassword: string;
  confirmPassword: string;
}

/** Length only, matching the API. It owns the breach and reuse checks. */
const ResetPasswordSchema = Yup.object({
  newPassword: Yup.string()
    .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
    .required("Password is required."),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("newPassword")], "Passwords do not match.")
    .required("Confirm your password."),
});

function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetToken = searchParams.get("token") ?? "";
  const { showToast } = useCustomToast();
  const { mutateAsync: resetPassword } = useResetPassword();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(
    values: ResetFormValues,
    { setSubmitting }: FormikHelpers<ResetFormValues>,
  ) {
    setError(null);

    try {
      await resetPassword({ resetToken, newPassword: values.newPassword });

      // A reset revokes every session server-side. Clearing the local copy keeps
      // this tab from holding tokens the API has already forgotten.
      clearPersistedSession();

      showToast({
        title: "Password updated",
        description: "You've been signed out everywhere. Sign in with the new one.",
        type: "success",
      });
      router.replace("/auth/login");
    } catch (err) {
      const message = toErrorMessage(err, "That reset link is no longer valid. Request a new one.");
      setError(message);
      showToast({ title: "Reset failed", description: message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  if (!resetToken) {
    return (
      <div>
        <AuthHeading
          title="This reset link is incomplete"
          description="Reset links can only be opened from the message we sent. Request a fresh one to continue."
        />
        <Button asChild size="xl" className="w-full">
          <Link href="/auth/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <AuthHeading
        title="Choose a new password"
        description="Make it long — length beats symbols."
      />

      <Formik<ResetFormValues>
        initialValues={{ newPassword: "", confirmPassword: "" }}
        validationSchema={ResetPasswordSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-4">
            <div>
              <Field
                name="newPassword"
                type="password"
                as={FloatingLabelInput}
                label="New password"
                autoComplete="new-password"
                hint="At least 10 characters."
                required
              />
              <ErrorMessage
                name="newPassword"
                component="span"
                className="mt-1 block text-xs text-kumtru-risk"
              />
            </div>

            <div>
              <Field
                name="confirmPassword"
                type="password"
                as={FloatingLabelInput}
                label="Confirm new password"
                autoComplete="new-password"
                required
              />
              <ErrorMessage
                name="confirmPassword"
                component="span"
                className="mt-1 block text-xs text-kumtru-risk"
              />
            </div>

            <FormError message={error} />

            <Button type="submit" size="xl" disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Spinner /> : "Update password"}
            </Button>
          </Form>
        )}
      </Formik>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Spinner size="lg" className="mx-auto text-kumtru-blue" />}>
      <ResetPassword />
    </Suspense>
  );
}
