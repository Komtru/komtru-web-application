"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ErrorMessage, Field, Form, Formik, type FormikHelpers } from "formik";
import * as Yup from "yup";

import { AuthHeading } from "@/components/forms/auth-heading";
import { FormError } from "@/components/forms/form-error";
import { SocialSignIn } from "@/components/forms/social-sign-in";
import { Button } from "@/components/ui/button";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Spinner } from "@/components/ui/spinner";
import { HOME_ROUTE, PLATFORM, deviceFingerprint, stashMfaChallenge } from "@/helpers/auth";
import { toErrorMessage } from "@/helpers/errors";
import { useCustomToast } from "@/hooks/useCustomToast";
import { isMfaChallenge } from "@/interfaces/auth";
import { useLogin } from "@/services/auth.services";
import { useAuthStore } from "@/store/auth.store";

interface LoginFormValues {
  identifier: string;
  password: string;
}

/**
 * One field for email, phone or username, because that is what the API accepts.
 *
 * No format validation on it: guessing which of the three the user meant, and
 * rejecting a valid username for not looking like an email, would be worse than
 * letting the API resolve it.
 */
const LoginSchema = Yup.object({
  identifier: Yup.string().trim().required("Enter your email, phone number or username."),
  password: Yup.string().required("Password is required."),
});

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useCustomToast();
  const { mutateAsync: login } = useLogin();
  const startSession = useAuthStore((state) => state.startSession);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(
    values: LoginFormValues,
    { setSubmitting }: FormikHelpers<LoginFormValues>,
  ) {
    setError(null);

    try {
      const result = await login({
        identifier: values.identifier.trim(),
        password: values.password,
        deviceFingerprint: deviceFingerprint(),
        platform: PLATFORM,
      });

      if (isMfaChallenge(result)) {
        stashMfaChallenge({
          mfaToken: result.mfaToken,
          factors: result.factors,
          identifier: values.identifier.trim(),
        });
        router.push("/auth/2fa");
        return;
      }

      startSession(result);
      showToast({ title: "Welcome back", type: "success" });
      router.replace(HOME_ROUTE);
    } catch (err) {
      // The API answers every credential failure identically and on purpose, so
      // this message stays as vague as the response it is reporting.
      const message = toErrorMessage(err, "We couldn't sign you in. Check your details and retry.");
      setError(message);
      showToast({ title: "Sign in failed", description: message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <AuthHeading
        title="Sign in to Komtru"
        description="Pick up where your trades left off. Nothing releases without your say."
      />

      <Formik<LoginFormValues>
        initialValues={{ identifier: "", password: "" }}
        validationSchema={LoginSchema}
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

            <div>
              <Field
                name="password"
                type="password"
                as={FloatingLabelInput}
                label="Password"
                autoComplete="current-password"
                required
              />
              <ErrorMessage
                name="password"
                component="span"
                className="mt-1 block text-xs text-kumtru-risk"
              />
              <div className="mt-2 text-right">
                <Link
                  href="/auth/forgot-password"
                  className="text-xs font-semibold text-kumtru-blue hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <FormError message={error} />

            <Button type="submit" size="xl" disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Spinner /> : "Sign in"}
            </Button>

            <SocialSignIn />

            <p className="text-center text-xs text-kumtru-slate-500">
              New to Komtru?{" "}
              <Link
                href="/auth/register"
                className="font-semibold text-kumtru-blue hover:underline"
              >
                Create an account
              </Link>
            </p>
          </Form>
        )}
      </Formik>
    </div>
  );
}
