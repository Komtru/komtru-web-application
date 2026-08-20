"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ErrorMessage, Field, Form, Formik, type FormikHelpers } from "formik";
import { Check, Copy } from "lucide-react";
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

export default function AuthenticatorSetupPage() {
  const router = useRouter();
  const { showToast } = useCustomToast();
  const { mutateAsync: init, isPending: isInitialising } = useInitTwoFactor();
  const { mutateAsync: finish } = useFinishTwoFactor();

  const [qrDataURL, setQrDataURL] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;

    init({ method: TwoFactorMethodEnum.AUTHENTICATOR })
      .then((result) => {
        if (result.method === TwoFactorMethodEnum.AUTHENTICATOR) {
          setQrDataURL(result.qrDataURL);
          setSecret(result.secret);
        }
      })
      .catch((err: unknown) => {
        setError(toErrorMessage(err, "We couldn't start authenticator setup. Try again shortly."));
      });
  }, [init]);

  async function handleCopy() {
    if (!secret || !navigator.clipboard) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit(
    values: ConfirmFormValues,
    { setSubmitting }: FormikHelpers<ConfirmFormValues>,
  ) {
    setError(null);

    try {
      await finish({ method: TwoFactorMethodEnum.AUTHENTICATOR, code: values.code });
      showToast({
        title: "Two-step verification on",
        description: "Your authenticator app is now required at sign in.",
        type: "success",
      });
      router.replace("/trades");
    } catch (err) {
      const message = toErrorMessage(
        err,
        "That code didn't match. Try the next one your app shows.",
      );
      setError(message);
      showToast({ title: "Setup failed", description: message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <AuthHeading
        title="Scan this with your authenticator"
        description="Use Google Authenticator, 1Password, Authy or any TOTP app, then enter the code it shows."
      />

      <div className="rounded-kumtru-md border border-border bg-card p-5">
        {isInitialising || (!qrDataURL && !error) ? (
          <div className="flex h-44 items-center justify-center">
            <Spinner size="lg" className="text-kumtru-blue" />
          </div>
        ) : null}

        {qrDataURL ? (
          <div className="flex flex-col items-center">
            <Image
              src={qrDataURL}
              alt="Authenticator setup QR code"
              width={168}
              height={168}
              unoptimized
              className="rounded-kumtru-sm bg-white p-2"
            />

            {secret ? (
              <div className="mt-4 w-full">
                <p className="text-[11px] font-semibold tracking-wide text-kumtru-slate-500 uppercase">
                  Or enter this key manually
                </p>
                <div className="mt-2 flex items-center gap-2 rounded-kumtru-sm bg-kumtru-slate-50 p-2.5 dark:bg-kumtru-slate-800">
                  <code className="flex-1 font-mono text-xs break-all">{secret}</code>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={handleCopy}>
                    {copied ? (
                      <Check className="size-3.5 text-kumtru-success" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    <span className="sr-only">Copy setup key</span>
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <Formik<ConfirmFormValues>
        initialValues={{ code: "" }}
        validationSchema={ConfirmSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="mt-5 space-y-4">
            <div>
              <Field
                name="code"
                as={FloatingLabelInput}
                label="6-digit code from your app"
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

            <Button
              type="submit"
              size="xl"
              disabled={isSubmitting || !qrDataURL}
              className="w-full"
            >
              {isSubmitting ? <Spinner /> : "Turn on two-step verification"}
            </Button>
          </Form>
        )}
      </Formik>
    </div>
  );
}
