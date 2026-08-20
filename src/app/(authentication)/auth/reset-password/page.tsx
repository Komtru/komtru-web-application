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
import { useResetPassword } from "@/services/auth.services";

interface ResetFormValues {
  password: string;
  confirmPassword: string;
}

const ResetPasswordSchema = Yup.object({
  password: Yup.string()
    .min(10, "Use at least 10 characters.")
    .matches(/[A-Z]/, "Include an uppercase letter.")
    .matches(/[a-z]/, "Include a lowercase letter.")
    .matches(/\d/, "Include a number.")
    .required("Password is required."),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords do not match.")
    .required("Confirm your password."),
});

function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { showToast } = useCustomToast();
  const { mutateAsync: resetPassword } = useResetPassword();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(
    values: ResetFormValues,
    { setSubmitting }: FormikHelpers<ResetFormValues>,
  ) {
    setError(null);

    try {
      await resetPassword({ token, password: values.password });
      showToast({
        title: "Password updated",
        description: "Sign in with your new password.",
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

  if (!token) {
    return (
      <div>
        <AuthHeading
          title="This reset link is incomplete"
          description="Reset links can only be opened from the email we sent. Request a fresh one to continue."
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
        initialValues={{ password: "", confirmPassword: "" }}
        validationSchema={ResetPasswordSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-4">
            <div>
              <Field
                name="password"
                type="password"
                as={FloatingLabelInput}
                label="New password"
                required
              />
              <ErrorMessage
                name="password"
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
