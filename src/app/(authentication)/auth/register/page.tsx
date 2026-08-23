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
import { Checkbox } from "@/components/ui/checkbox";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Spinner } from "@/components/ui/spinner";
import { TERMS_VERSION } from "@/helpers/auth";
import { toErrorMessage } from "@/helpers/errors";
import { useCustomToast } from "@/hooks/useCustomToast";
import { PASSWORD_MIN_LENGTH, type RegistrationChannel } from "@/interfaces/auth";
import { useRegister } from "@/services/auth.services";
import { cn } from "@/lib/utils";

interface RegisterFormValues {
  channel: RegistrationChannel;
  email: string;
  phone: string;
  password: string;
  acceptedTerms: boolean;
  marketingOptIn: boolean;
}

/**
 * Length only, matching the API's policy.
 *
 * No uppercase/digit/symbol rules: the API deliberately does not have them —
 * forced composition produces `Password1!` at scale, which is in every breach
 * corpus. It checks the password against that corpus instead, and says so in its
 * 400 if it fails.
 */
const RegisterSchema = Yup.object({
  channel: Yup.mixed<RegistrationChannel>().oneOf(["EMAIL", "PHONE"]).required(),
  email: Yup.string().when("channel", {
    is: "EMAIL",
    then: (schema) => schema.email("Enter a valid email address.").required("Email is required."),
    otherwise: (schema) => schema.strip(),
  }),
  phone: Yup.string().when("channel", {
    is: "PHONE",
    then: (schema) =>
      schema
        .trim()
        .matches(/^\+?[\d\s-]{7,20}$/, "Enter a valid phone number, with country code.")
        .required("Phone number is required."),
    otherwise: (schema) => schema.strip(),
  }),
  password: Yup.string()
    .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
    .required("Password is required."),
  acceptedTerms: Yup.boolean().oneOf([true], "You need to accept the terms to continue."),
  marketingOptIn: Yup.boolean(),
});

const CHANNELS: { value: RegistrationChannel; label: string }[] = [
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Phone" },
];

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useCustomToast();
  const { mutateAsync: register } = useRegister();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(
    values: RegisterFormValues,
    { setSubmitting }: FormikHelpers<RegisterFormValues>,
  ) {
    setError(null);

    const destination = values.channel === "EMAIL" ? values.email.trim() : values.phone.trim();

    try {
      // The API forbids the field belonging to the other channel — sending an
      // empty `phone` alongside `channel: 'EMAIL'` is a 400, not a no-op.
      const result = await register({
        channel: values.channel,
        ...(values.channel === "EMAIL" ? { email: destination } : { phone: destination }),
        password: values.password,
        acceptedTermsVersion: TERMS_VERSION,
        marketingOptIn: values.marketingOptIn,
      });

      const params = new URLSearchParams({
        challenge: result.challengeId,
        channel: values.channel,
        to: destination,
      });

      router.push(`/auth/verify?${params.toString()}`);
    } catch (err) {
      const message = toErrorMessage(err, "We couldn't create your account. Please try again.");
      setError(message);
      showToast({ title: "Registration failed", description: message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <AuthHeading
        title="Create your Komtru account"
        description="One account covers both sides of a deal — buy on one trade, sell on the next."
      />

      <Formik<RegisterFormValues>
        initialValues={{
          channel: "EMAIL",
          email: "",
          phone: "",
          password: "",
          acceptedTerms: false,
          marketingOptIn: false,
        }}
        validationSchema={RegisterSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting, values, setFieldValue, errors, touched }) => (
          <Form className="space-y-4">
            {/* One channel is verified now; the second is added from settings later. */}
            <div
              role="radiogroup"
              aria-label="Sign up with"
              className="flex rounded-kumtru-sm bg-secondary p-1"
            >
              {CHANNELS.map((channel) => (
                <button
                  key={channel.value}
                  type="button"
                  role="radio"
                  aria-checked={values.channel === channel.value}
                  onClick={() => void setFieldValue("channel", channel.value)}
                  className={cn(
                    "flex-1 rounded-md py-2 text-[13px] font-semibold transition-colors",
                    values.channel === channel.value
                      ? "bg-card text-foreground shadow-sm"
                      : "text-kumtru-slate-500",
                  )}
                >
                  {channel.label}
                </button>
              ))}
            </div>

            {values.channel === "EMAIL" ? (
              <div>
                <Field
                  name="email"
                  type="email"
                  as={FloatingLabelInput}
                  label="Email"
                  autoComplete="email"
                  autoCapitalize="none"
                  required
                />
                <ErrorMessage
                  name="email"
                  component="span"
                  className="mt-1 block text-xs text-kumtru-risk"
                />
              </div>
            ) : (
              <div>
                <Field
                  name="phone"
                  type="tel"
                  as={FloatingLabelInput}
                  label="Phone number"
                  autoComplete="tel"
                  hint="Include the country code, e.g. +234."
                  required
                />
                <ErrorMessage
                  name="phone"
                  component="span"
                  className="mt-1 block text-xs text-kumtru-risk"
                />
              </div>
            )}

            <div>
              <Field
                name="password"
                type="password"
                as={FloatingLabelInput}
                label="Password"
                autoComplete="new-password"
                hint="At least 10 characters. Length beats symbols."
                required
              />
              <ErrorMessage
                name="password"
                component="span"
                className="mt-1 block text-xs text-kumtru-risk"
              />
            </div>

            <div className="flex items-start gap-2.5 pt-1">
              <Checkbox
                id="acceptedTerms"
                checked={values.acceptedTerms}
                onCheckedChange={(checked) => void setFieldValue("acceptedTerms", checked === true)}
                className="mt-0.5"
              />
              <label
                htmlFor="acceptedTerms"
                className="text-xs leading-relaxed text-kumtru-slate-600"
              >
                I agree to the{" "}
                <Link href="/terms" className="font-semibold text-kumtru-blue hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="font-semibold text-kumtru-blue hover:underline">
                  Privacy Policy
                </Link>
                .
              </label>
            </div>
            {touched.acceptedTerms && errors.acceptedTerms ? (
              <span className="block text-xs text-kumtru-risk">{errors.acceptedTerms}</span>
            ) : null}

            <div className="flex items-start gap-2.5">
              <Checkbox
                id="marketingOptIn"
                checked={values.marketingOptIn}
                onCheckedChange={(checked) =>
                  void setFieldValue("marketingOptIn", checked === true)
                }
                className="mt-0.5"
              />
              {/* Opt-in, unticked by default. Trade updates are sent either way — they
                  are contractual, not marketing, and are not switchable here. */}
              <label
                htmlFor="marketingOptIn"
                className="text-xs leading-relaxed text-kumtru-slate-600"
              >
                Send me occasional product news. Trade updates come regardless.
              </label>
            </div>

            <FormError message={error} />

            <Button type="submit" size="xl" disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Spinner /> : "Create account"}
            </Button>

            <SocialSignIn />

            <p className="text-center text-xs text-kumtru-slate-500">
              Already have an account?{" "}
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
