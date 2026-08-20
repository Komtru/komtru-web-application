"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ErrorMessage, Field, Form, Formik, type FormikHelpers } from "formik";
import * as Yup from "yup";

import { AuthHeading } from "@/components/forms/auth-heading";
import { FormError } from "@/components/forms/form-error";
import { Button } from "@/components/ui/button";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Spinner } from "@/components/ui/spinner";
import { toErrorMessage } from "@/helpers/errors";
import { useCustomToast } from "@/hooks/useCustomToast";
import type { LoginPayloadInterface } from "@/interfaces/auth";
import { useLogin } from "@/services/auth.services";
import { useAuthStore } from "@/store/auth.store";

const LoginSchema = Yup.object({
  email: Yup.string().email("Enter a valid email address.").required("Email is required."),
  password: Yup.string().required("Password is required."),
});

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useCustomToast();
  const { mutateAsync: login } = useLogin();
  const initUserStore = useAuthStore((state) => state.initUserStore);
  const [error, setError] = useState<string | null>(null);

  const initialValues: LoginPayloadInterface = { email: "", password: "" };

  async function handleSubmit(
    values: LoginPayloadInterface,
    { setSubmitting }: FormikHelpers<LoginPayloadInterface>,
  ) {
    setError(null);

    try {
      const result = await login(values);

      if (result.requires2FA) {
        const params = new URLSearchParams({
          challenge: result.challengeId,
          email: values.email,
          method: result.method,
        });
        router.push(`/auth/2fa?${params.toString()}`);
        return;
      }

      initUserStore({
        auth: result.auth,
        user: result.user,
        tokens: result.tokens,
      });

      showToast({ title: "Welcome back", type: "success" });
      router.replace("/trades");
    } catch (err) {
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
        title="Sign in to Kumtru"
        description="Pick up where your trades left off. Nothing releases without your say."
      />

      <Formik<LoginPayloadInterface>
        initialValues={initialValues}
        validationSchema={LoginSchema}
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

            <div>
              <Field
                name="password"
                type="password"
                as={FloatingLabelInput}
                label="Password"
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

            <p className="text-center text-xs text-kumtru-slate-500">
              New to Kumtru?{" "}
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
