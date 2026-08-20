"use client";

import { useEffect, useRef, useState } from "react";
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
import { TwoFactorMethodEnum } from "@/interfaces/auth";
import { useFinishTwoFactor, useInitTwoFactor } from "@/services/auth.services";

interface ConfirmFormValues {
  code: string;
}

const ConfirmSchema = Yup.object({
  code: Yup.string()
    .matches(/^\d{6}$/, "Enter the 6-digit code.")
    .required("Enter the 6-digit code."),
});

export default function EmailTwoFactorSetupPage() {
  const router = useRouter();
  const { showToast } = useCustomToast();
  const { mutateAsync: init, isPending: isSending } = useInitTwoFactor();
  const { mutateAsync: finish } = useFinishTwoFactor();

  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;

    init({ method: TwoFactorMethodEnum.EMAIL })
      .then((result) => setSentMessage(result.message))
      .catch((err: unknown) => {
        setError(toErrorMessage(err, "We couldn't send that code. Try again shortly."));
      });
  }, [init]);

  async function handleSubmit(
    values: ConfirmFormValues,
    { setSubmitting }: FormikHelpers<ConfirmFormValues>,
  ) {
    setError(null);

    try {
      await finish({ method: TwoFactorMethodEnum.EMAIL, code: values.code });
      showToast({
        title: "Two-step verification on",
        description: "We'll email a code when you sign in from a new device.",
        type: "success",
      });
      router.replace("/trades");
    } catch (err) {
      const message = toErrorMessage(err, "That code didn't match. Request a new one and retry.");
      setError(message);
      showToast({ title: "Setup failed", description: message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <AuthHeading
        title="Confirm your email codes"
        description={
          sentMessage ??
          (isSending ? "Sending a code to your email…" : "Enter the 6-digit code we emailed you.")
        }
      />

      <Formik<ConfirmFormValues>
        initialValues={{ code: "" }}
        validationSchema={ConfirmSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-4">
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
              {isSubmitting ? <Spinner /> : "Turn on two-step verification"}
            </Button>
          </Form>
        )}
      </Formik>
    </div>
  );
}
