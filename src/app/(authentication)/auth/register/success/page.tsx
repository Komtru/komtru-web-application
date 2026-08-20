"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";

import { FormError } from "@/components/forms/form-error";
import { SafetyCallout } from "@/components/general/safety-callout";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toErrorMessage } from "@/helpers/errors";
import { useCustomToast } from "@/hooks/useCustomToast";
import { useSendVerificationEmail } from "@/services/auth.services";

function RegisterSuccess() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const { showToast } = useCustomToast();
  const { mutateAsync: resend, isPending } = useSendVerificationEmail();
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    if (!email) {
      setError("We don't have an email address to send to. Sign in to request a new link.");
      return;
    }

    setError(null);

    try {
      await resend({ email });
      showToast({ title: "Verification email sent", description: email, type: "success" });
    } catch (err) {
      const message = toErrorMessage(err, "We couldn't resend that email. Try again shortly.");
      setError(message);
      showToast({ title: "Resend failed", description: message, type: "error" });
    }
  }

  return (
    <div className="text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-kumtru-success-soft">
        <MailCheck className="size-6 text-kumtru-success-on-soft" aria-hidden="true" />
      </div>

      <h2 className="mt-4 text-2xl font-semibold">Verify your email</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-kumtru-slate-500">
        We sent a verification link{email ? " to " : ""}
        {email ? <b className="font-semibold text-foreground">{email}</b> : null}. Open it to finish
        setting up your account.
      </p>

      <div className="mt-6 space-y-3">
        <FormError message={error} />

        <Button
          variant="secondary"
          size="xl"
          onClick={handleResend}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? <Spinner /> : "Resend verification email"}
        </Button>

        <Button asChild variant="ghost" className="w-full">
          <Link href="/auth/login">Back to sign in</Link>
        </Button>
      </div>

      <SafetyCallout className="mt-6 text-left" title="Only ever verify from your own inbox.">
        Kumtru will not send you a verification code by SMS or ask anyone to read one out to you.
      </SafetyCallout>
    </div>
  );
}

export default function RegisterSuccessPage() {
  return (
    <Suspense fallback={<Spinner size="lg" className="mx-auto text-kumtru-blue" />}>
      <RegisterSuccess />
    </Suspense>
  );
}
