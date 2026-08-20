"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ErrorMessage, Field, Form, Formik, type FormikHelpers } from "formik";
import * as Yup from "yup";

import { AuthHeading } from "@/components/forms/auth-heading";
import { FormError } from "@/components/forms/form-error";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Spinner } from "@/components/ui/spinner";
import { toErrorMessage } from "@/helpers/errors";
import { useCustomToast } from "@/hooks/useCustomToast";
import type { RegisterPayloadInterface } from "@/interfaces/auth";
import { useRegister } from "@/services/auth.services";

const RegisterSchema = Yup.object({
  firstName: Yup.string().trim().min(2, "Too short.").required("First name is required."),
  lastName: Yup.string().trim().min(2, "Too short.").required("Last name is required."),
  email: Yup.string().email("Enter a valid email address.").required("Email is required."),
  phone: Yup.string()
    .trim()
    .matches(/^[+\d][\d\s-]{6,}$/, {
      message: "Enter a valid phone number.",
      excludeEmptyString: true,
    })
    .notRequired(),
  password: Yup.string()
    .min(10, "Use at least 10 characters.")
    .matches(/[A-Z]/, "Include an uppercase letter.")
    .matches(/[a-z]/, "Include a lowercase letter.")
    .matches(/\d/, "Include a number.")
    .required("Password is required."),
  acceptedTerms: Yup.boolean().oneOf([true], "You need to accept the terms to continue."),
});

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useCustomToast();
  const { mutateAsync: register } = useRegister();
  const [error, setError] = useState<string | null>(null);

  const initialValues: RegisterPayloadInterface = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    acceptedTerms: false,
  };

  async function handleSubmit(
    values: RegisterPayloadInterface,
    { setSubmitting }: FormikHelpers<RegisterPayloadInterface>,
  ) {
    setError(null);

    try {
      await register(values);
      showToast({
        title: "Account created",
        description: "Check your inbox to verify your email.",
        type: "success",
      });
      router.push(`/auth/register/success?email=${encodeURIComponent(values.email)}`);
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
        title="Create your Kumtru account"
        description="One account covers both sides of a deal — buy on one trade, sell on the next."
      />

      <Formik<RegisterPayloadInterface>
        initialValues={initialValues}
        validationSchema={RegisterSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting, values, setFieldValue, errors, touched }) => (
          <Form className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Field name="firstName" as={FloatingLabelInput} label="First name" required />
                <ErrorMessage
                  name="firstName"
                  component="span"
                  className="mt-1 block text-xs text-kumtru-risk"
                />
              </div>
              <div>
                <Field name="lastName" as={FloatingLabelInput} label="Last name" required />
                <ErrorMessage
                  name="lastName"
                  component="span"
                  className="mt-1 block text-xs text-kumtru-risk"
                />
              </div>
            </div>

            <div>
              <Field name="email" type="email" as={FloatingLabelInput} label="Email" required />
              <ErrorMessage
                name="email"
                component="span"
                className="mt-1 block text-xs text-kumtru-risk"
              />
            </div>

            <div>
              <Field name="phone" type="tel" as={FloatingLabelInput} label="Phone (optional)" />
              <ErrorMessage
                name="phone"
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

            <FormError message={error} />

            <Button type="submit" size="xl" disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Spinner /> : "Create account"}
            </Button>

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
