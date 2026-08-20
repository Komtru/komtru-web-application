"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, CircleX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toErrorMessage } from "@/helpers/errors";
import { useVerifyEmail } from "@/services/auth.services";

type VerifyState = "verifying" | "verified" | "failed" | "missing-token";

function VerifyEmail() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { mutateAsync: verifyEmail } = useVerifyEmail();

  const [state, setState] = useState<VerifyState>(token ? "verifying" : "missing-token");
  const [error, setError] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;

    verifyEmail({ token })
      .then(() => setState("verified"))
      .catch((err: unknown) => {
        setError(
          toErrorMessage(err, "This verification link is invalid or has already been used."),
        );
        setState("failed");
      });
  }, [token, verifyEmail]);

  if (state === "verifying") {
    return (
      <div className="py-10 text-center">
        <Spinner size="lg" className="mx-auto text-kumtru-blue" />
        <p className="mt-4 text-sm text-kumtru-slate-500">Verifying your email…</p>
      </div>
    );
  }

  if (state === "verified") {
    return (
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-kumtru-success-soft">
          <BadgeCheck className="size-6 text-kumtru-success-on-soft" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-2xl font-semibold">Email verified</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-kumtru-slate-500">
          Your account is ready. Sign in to start or accept your first trade.
        </p>
        <Button asChild size="xl" className="mt-6 w-full">
          <Link href="/auth/login">Continue to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-kumtru-risk-soft">
        <CircleX className="size-6 text-kumtru-risk-on-soft" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-2xl font-semibold">
        {state === "missing-token" ? "Nothing to verify" : "Verification failed"}
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-kumtru-slate-500">
        {state === "missing-token"
          ? "Open the verification link from your inbox — this page needs the token it carries."
          : error}
      </p>
      <div className="mt-6 space-y-3">
        <Button asChild variant="secondary" size="xl" className="w-full">
          <Link href="/auth/login">Sign in to resend</Link>
        </Button>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<Spinner size="lg" className="mx-auto text-kumtru-blue" />}>
      <VerifyEmail />
    </Suspense>
  );
}
