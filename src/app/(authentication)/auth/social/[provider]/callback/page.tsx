"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CircleX } from "lucide-react";

import { AuthHeading } from "@/components/forms/auth-heading";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { HOME_ROUTE } from "@/helpers/auth";
import { toErrorMessage } from "@/helpers/errors";
import { useCustomToast } from "@/hooks/useCustomToast";
import { isSocialLinkResult, type SocialProviderSlug } from "@/interfaces/auth";
import { authKeys, useSocialCallback } from "@/services/auth.services";
import { useAuthStore } from "@/store/auth.store";

const SUPPORTED: SocialProviderSlug[] = ["google", "apple", "facebook"];

const PROVIDER_LABEL: Record<SocialProviderSlug, string> = {
  google: "Google",
  apple: "Apple",
  facebook: "Facebook",
};

/** Falls back to the slug, so an unexpected provider still reads as a name. */
function providerLabel(slug: string): string {
  return PROVIDER_LABEL[slug as SocialProviderSlug] ?? slug;
}

/**
 * Where the provider sends the browser back to.
 *
 * It has to be a page in THIS app rather than the API's own callback route:
 * that one is a `POST`, and a provider redirect is a `GET`. So the browser lands
 * here with `?code=&state=`, and this page hands both to the API.
 */
function SocialCallback() {
  const router = useRouter();
  const params = useParams<{ provider: string }>();
  const searchParams = useSearchParams();
  const { showToast } = useCustomToast();
  const { mutateAsync: completeCallback } = useSocialCallback();
  const startSession = useAuthStore((state) => state.startSession);
  const queryClient = useQueryClient();

  const [error, setError] = useState<string | null>(null);
  const attempted = useRef(false);

  const provider = params.provider as SocialProviderSlug;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  // The provider's own refusal — the user pressed cancel, or consent was denied.
  const providerError = searchParams.get("error");

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    if (providerError) {
      setError("Sign-in was cancelled before it finished.");
      return;
    }

    if (!SUPPORTED.includes(provider) || !code || !state) {
      setError("That sign-in link is incomplete. Start again from the sign-in screen.");
      return;
    }

    async function exchange() {
      try {
        const result = await completeCallback({ provider, code, state } as {
          provider: SocialProviderSlug;
          code: string;
          state: string;
        });

        // A callback with an existing session LINKS rather than signs in — the
        // "Connect" rows in Settings are what reach this branch. Back to where
        // the user pressed the button, not to the app's home: they were managing
        // their account, not signing in, and the answer belongs on that screen.
        //
        // The identity list is now stale by definition, so it is dropped rather
        // than left to show the provider as unconnected on arrival.
        if (isSocialLinkResult(result)) {
          void queryClient.invalidateQueries({ queryKey: authKeys.socialIdentities() });
          showToast({ title: `${providerLabel(provider)} connected`, type: "success" });
          router.replace("/settings");
          return;
        }

        startSession(result);
        showToast({
          title: result.isNewUser ? "Welcome to Komtru" : "Welcome back",
          type: "success",
        });
        router.replace(HOME_ROUTE);
      } catch (err) {
        // A 409 here means the address already belongs to an account and the API
        // wants proof before linking them. Completing that needs the step-up
        // flow, which is not built — so this says what happened rather than
        // pretending the sign-in merely failed.
        setError(
          toErrorMessage(err, "We couldn't finish that sign-in. Try again, or use your password."),
        );
      }
    }

    void exchange();
  }, [
    code,
    completeCallback,
    provider,
    providerError,
    queryClient,
    router,
    showToast,
    startSession,
    state,
  ]);

  if (error) {
    return (
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-kumtru-risk-soft">
          <CircleX className="size-6 text-kumtru-risk-on-soft" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-2xl font-semibold">Sign-in didn&apos;t complete</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-kumtru-slate-500">{error}</p>
        <Button asChild size="xl" className="mt-6 w-full">
          <Link href="/auth/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="py-10 text-center">
      <Spinner size="lg" className="mx-auto text-kumtru-blue" />
      <AuthHeading
        className="mt-6"
        title="Finishing sign-in"
        description="Confirming with your provider. This only takes a moment."
      />
    </div>
  );
}

export default function SocialCallbackPage() {
  return (
    <Suspense fallback={<Spinner size="lg" className="mx-auto text-kumtru-blue" />}>
      <SocialCallback />
    </Suspense>
  );
}
