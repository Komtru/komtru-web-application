"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { socialRedirectUri } from "@/helpers/auth";
import { toErrorMessage } from "@/helpers/errors";
import { useCustomToast } from "@/hooks/useCustomToast";
import type { SocialProvider, SocialProviderSlug } from "@/interfaces/auth";
import { useSocialAuthorize, useSocialProviders } from "@/services/auth.services";

/** Google's mark. Inline rather than an icon-font glyph — brand marks have exact colours. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className="size-[18px]">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-[18px]">
      <path d="M16.36 12.78c.02-2.3 1.88-3.4 1.96-3.45-1.07-1.56-2.73-1.78-3.32-1.8-1.42-.14-2.76.83-3.48.83-.71 0-1.82-.81-2.99-.79-1.54.02-2.96.89-3.75 2.26-1.6 2.77-.41 6.88 1.15 9.13.76 1.1 1.67 2.34 2.86 2.29 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.78.74 2.99.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.4-3.64ZM14.1 5.9c.63-.77 1.06-1.83.94-2.9-.91.04-2.01.61-2.66 1.37-.58.68-1.09 1.77-.95 2.81 1.01.08 2.04-.52 2.67-1.28Z" />
    </svg>
  );
}

const PROVIDERS: {
  slug: SocialProviderSlug;
  code: SocialProvider;
  label: string;
  mark: () => React.JSX.Element;
}[] = [
  { slug: "google", code: "GOOGLE", label: "Continue with Google", mark: GoogleMark },
  { slug: "apple", code: "APPLE", label: "Continue with Apple", mark: AppleMark },
];

/**
 * Provider buttons, rendered only for providers the deployment has configured.
 *
 * `GET /auth/providers` is what decides — a button for a provider with no client
 * id would fail at the authorize call with a 501, after the user had already
 * committed to it.
 */
export function SocialSignIn({ mode = "LOGIN" }: { mode?: "LOGIN" | "LINK" }) {
  const { showToast } = useCustomToast();
  const { data, isLoading } = useSocialProviders();
  const { mutateAsync: authorize } = useSocialAuthorize();
  const [pending, setPending] = useState<SocialProviderSlug | null>(null);

  const available = PROVIDERS.filter((provider) => data?.providers?.includes(provider.code));

  if (isLoading || available.length === 0) return null;

  async function handleClick(slug: SocialProviderSlug) {
    setPending(slug);

    try {
      const { authorizationUrl } = await authorize({
        provider: slug,
        mode,
        redirectUri: socialRedirectUri(slug),
      });

      // A full navigation, not `router.push`: the destination is the provider's
      // origin, which Next.js cannot route to.
      window.location.assign(authorizationUrl);
    } catch (error) {
      setPending(null);
      showToast({
        title: "Couldn't start sign-in",
        description: toErrorMessage(error, "Try again, or use your email and password."),
        type: "error",
      });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-medium text-kumtru-slate-500">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {available.map((provider) => (
        <Button
          key={provider.slug}
          type="button"
          variant="outline"
          size="xl"
          disabled={pending !== null}
          onClick={() => void handleClick(provider.slug)}
          className="w-full gap-2.5"
        >
          {pending === provider.slug ? <Spinner /> : <provider.mark />}
          {provider.label}
        </Button>
      ))}
    </div>
  );
}
