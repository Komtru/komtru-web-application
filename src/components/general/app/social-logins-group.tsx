"use client";

import { Check } from "lucide-react";

import { SettingsGroup, SettingsRow } from "@/components/general/app/settings-group";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { socialRedirectUri } from "@/helpers/auth";
import { toErrorMessage } from "@/helpers/errors";
import { formatInZone } from "@/helpers/timezones";
import { useCustomToast } from "@/hooks/useCustomToast";
import type { SocialProvider, SocialProviderSlug } from "@/interfaces/auth";
import { useSocialAuthorize, useSocialIdentities, useSocialProviders } from "@/services/auth.services";

/** Slug for the URL, label for the human. `SocialProvider` is the wire's own uppercase form. */
const PROVIDER_META: Record<SocialProvider, { slug: SocialProviderSlug; label: string }> = {
  GOOGLE: { slug: "google", label: "Google" },
  APPLE: { slug: "apple", label: "Apple" },
  FACEBOOK: { slug: "facebook", label: "Facebook" },
};

/**
 * "Sign-in methods" — attach Google or Apple to an account that was created with
 * an email address and a password.
 *
 * Linking reuses the ordinary sign-in flow rather than a separate endpoint. The
 * difference is `mode=LINK` on the authorize call: the API decides between login
 * and link by whether the callback arrives carrying a session, so the same two
 * requests do both jobs and there is one OAuth path to keep correct. Ours always
 * carries one, because this component only renders behind the signed-in shell.
 *
 * Only providers the deployment actually has credentials for are listed — the
 * set comes from `GET /auth/providers`, so a button never leads to a provider
 * the API cannot complete.
 *
 * Disconnecting is deliberately absent. `DELETE /me/social-identities/:provider`
 * requires a satisfied `SOCIAL_UNLINK` step-up, and presenting a Disconnect that
 * silently fails on a 403 would be worse than not offering it yet.
 */
export function SocialLoginsGroup() {
  const { showToast } = useCustomToast();

  const providers = useSocialProviders();
  const identities = useSocialIdentities();
  const authorize = useSocialAuthorize();

  // Which provider is mid-redirect. Held here rather than read off the mutation
  // so two rows cannot both show a spinner from one shared `isPending`.
  const pendingProvider = authorize.isPending ? authorize.variables?.provider : undefined;

  const available = providers.data?.providers ?? [];
  const linked = new Map(identities.data?.map((row) => [row.provider, row]) ?? []);

  async function connect(provider: SocialProvider) {
    const { slug, label } = PROVIDER_META[provider];

    try {
      const { authorizationUrl } = await authorize.mutateAsync({
        provider: slug,
        mode: "LINK",
        // The API's default redirect points at its own POST callback, which a
        // browser redirect can never reach — so this app names its own page.
        redirectUri: socialRedirectUri(slug),
      });

      // `assign`, not `replace`: the settings screen should still be behind the
      // back button if the user abandons consent at the provider.
      window.location.assign(authorizationUrl);
    } catch (error) {
      showToast({
        title: `Couldn't start the ${label} connection`,
        description: toErrorMessage(error),
        type: "error",
      });
    }
  }

  // Nothing configured, or the list has not arrived: render no group at all
  // rather than an empty box with a heading over it.
  if (providers.isLoading || identities.isLoading) {
    return (
      <SettingsGroup label="Sign-in methods">
        <SettingsRow label="Loading" trailing={<Spinner size="sm" />} />
      </SettingsGroup>
    );
  }

  if (available.length === 0) return null;

  // Without the identity list, every provider would render as "Connect" —
  // including one already attached, which the API then rejects after a round
  // trip through the provider. Better to say the state is unknown than to offer
  // an action whose outcome we cannot predict.
  if (identities.isError) {
    return (
      <SettingsGroup label="Sign-in methods">
        <SettingsRow
          label="Couldn't load your sign-in methods"
          hint={toErrorMessage(identities.error, "Check your connection and try again.")}
          trailing={
            <Button variant="secondary" size="sm" onClick={() => void identities.refetch()}>
              Retry
            </Button>
          }
        />
      </SettingsGroup>
    );
  }

  return (
    <SettingsGroup label="Sign-in methods">
      {available.map((provider) => {
        const { label } = PROVIDER_META[provider];
        const row = linked.get(provider);

        return (
          <SettingsRow
            key={provider}
            label={label}
            hint={
              row
                ? `Connected${row.linkedAt ? ` · ${formatInZone(row.linkedAt, undefined, "d LLL yyyy")}` : ""}`
                : `Sign in with ${label} instead of your password`
            }
            trailing={
              row ? (
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-kumtru-success-on-soft">
                  <Check className="size-3.5" aria-hidden="true" />
                  Connected
                </span>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={authorize.isPending}
                  onClick={() => void connect(provider)}
                >
                  {pendingProvider === PROVIDER_META[provider].slug ? <Spinner size="sm" /> : "Connect"}
                </Button>
              )
            }
          />
        );
      })}
    </SettingsGroup>
  );
}
