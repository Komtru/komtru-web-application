# Kumtru — Customer Web App

The **customer-facing** Kumtru app: an installable, mobile-first PWA for buyers. Two parties agree
terms up front, the buyer's payment is held under those terms, and it is released only when the
agreement is met.

Seller and internal (TrustOps) surfaces live in their own apps — nothing in this repo should grow a
seller shop, listings manager, or payouts screen.

- **App name / slug:** Kumtru / `kumtru`
- **Dev port:** `3100`
- **Backend:** `kumtru-backend-apis` on `:3000`, mounted at `/v1`

> **This repo is currently a frame, not a product.** Layout, navigation, PWA, theming, and the
> HTTP/auth/state plumbing are real and working. Feature modules (Trades, Trust Passport, Alerts,
> Disputes, Messaging) are deliberately unbuilt — see [Frame vs. modules](#frame-vs-modules).

## Prerequisites

- Node.js `>= 22`
- pnpm `>= 10`
- The backend running on `http://localhost:3000` (see `../backend-apis`)

## Getting started

```bash
pnpm install
cp .env.example .env.local   # then fill in any third-party keys
pnpm dev                     # http://localhost:3100
```

| Script              | What it does                                                |
| ------------------- | ----------------------------------------------------------- |
| `pnpm dev`          | Dev server on `:3100` with Turbopack                        |
| `pnpm build`        | Production build (Turbopack)                                |
| `pnpm start:prod`   | Serve the production build on `:3100`                       |
| `pnpm start`        | Start under pm2 as `kumtru-ui` and persist the process list |
| `pnpm typecheck`    | `tsc --noEmit`                                              |
| `pnpm lint`         | ESLint                                                      |
| `pnpm prettier:fix` | Format, including Tailwind class sorting                    |

The service worker only registers in production builds, so test install/offline behaviour with
`pnpm build && pnpm start:prod`, not `pnpm dev`.

## Environment variables

All are public (`NEXT_PUBLIC_*`) because they are read in the browser. **Never commit `.env.local`** —
only `.env.example` is tracked.

| Variable                         | Purpose                                                                 |
| -------------------------------- | ----------------------------------------------------------------------- |
| `NEXT_PUBLIC_BASE_URL`           | Backend origin + version prefix. The browser never calls this directly. |
| `NEXT_PUBLIC_WS_BASE_URL`        | Websocket origin for realtime trade updates.                            |
| `NEXT_PUBLIC_APP_URL`            | Public origin of this app; drives `metadataBase` and OG image URLs.     |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | reCAPTCHA v2 site key.                                                  |

## Mobile-first, literally

The layout is designed at phone width and **centred in a column** on larger screens (`max-w-[480px]`
with side borders), rather than growing a sidebar it would never have on the device most customers
actually use. There is no desktop shell and no sidebar primitive in this repo.

What that means concretely:

- **Bottom tab bar**, four fixed destinations — Trades, Passport, Alerts, Settings. There is
  deliberately **no browse/discovery tab**: discovery happens off-platform (Instagram, WhatsApp, a
  shared Trust Passport link) and a buyer arrives already knowing what they intend to buy.
- **Safe-area insets** on every sticky edge — `env(safe-area-inset-bottom)` on the tab bar,
  `env(safe-area-inset-top)` on headers — paired with `viewport-fit=cover`.
- **Sticky action bar** (`StickyActionBar`) for primary actions, with buttons stacked vertically so
  the secondary choice is never a thumb-slip from the irreversible one.
- `overscroll-behavior-y: none`, no tap-highlight flash, `touch-action: manipulation` on interactive
  elements to drop the 300ms tap delay.
- Pinch-to-zoom stays enabled (`maximumScale: 5`). Zoom is an accessibility feature, not a layout bug.

## PWA

Installable and offline-tolerant:

| Piece            | Where                                                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Manifest         | `public/site.webmanifest` — `start_url: /trades`, `display: standalone`, shortcuts, 192/512 icons plus **padded maskable** variants |
| Service worker   | `public/sw.js`                                                                                                                      |
| Registration     | `components/general/pwa/service-worker-registrar.tsx` (production only, after `load`)                                               |
| Install banner   | `components/general/pwa/install-prompt.tsx` (`beforeinstallprompt`, dismissal remembered)                                           |
| Offline fallback | `src/app/offline/page.tsx`                                                                                                          |
| Meta             | `viewport` + `appleWebApp` exports in `src/app/layout.tsx`                                                                          |

**The service worker is deliberately conservative.** This is a money app, so a stale screen that
looks authoritative is worse than an honest offline page:

- Same-origin static assets → cache-first (they are content-hashed).
- Navigations → network-first, falling back to `/offline`.
- **Anything under `/api/` is never intercepted or cached.** No trade state, no auth, ever.

The offline page shows no trade data at all — a cached "Protected" that is no longer true is the
worst thing this app could display.

Installing matters beyond convenience: an installed app is opened from the home screen rather than
from a link, which is the same habit that keeps someone off a spoofed "your trade" URL.

## Routing

Three route groups:

| Group              | Owns                                           | Shell                                                |
| ------------------ | ---------------------------------------------- | ---------------------------------------------------- |
| `(marketing)`      | `/`, `/privacy`, `/terms`                      | Dark navy, floating pill navbar, footer              |
| `(authentication)` | `/auth/*`                                      | Single column on mobile; brand panel appears at `lg` |
| `(app)`            | `/trades`, `/passport`, `/alerts`, `/settings` | Mobile shell + bottom tab bar, auth-gated            |

App routes sit at the root (`/trades`, not `/dashboard/trades`) to match the URLs in the screens
guide. `src/app/offline/` is outside every group — it must render with no shell and no session.

`src/middleware.ts` is deliberately a **pass-through**. Tokens live in `localStorage`, which
middleware cannot read, so guarding routes there would be theatre. `(app)/layout.tsx` redirects
client-side on `hydrated && !access`, and the API enforces access for real on every request.

## Architecture

### API access — proxy plus a single facade

`next.config.ts` rewrites `/api/:path*` → `${NEXT_PUBLIC_BASE_URL}/:path*`. The browser therefore
only ever makes **same-origin** requests, so there is no CORS surface and the backend can be
retargeted per environment without touching code.

Every request goes through `src/services/base.ts`, a singleton `HttpFacade` holding two axios
instances (JSON and multipart). Its methods take one object argument and return `response.data`.

- Only `services/base.ts` imports `axios`.
- Only `services/*.services.ts` import the facade.
- Components call React Query hooks — never the facade, never axios.

### Auth interceptors

Requests attach `Bearer <access token>` from the auth store, unless a caller set `Authorization`
explicitly. Responses share one error handler, attached to both instances:

1. A **revoked** token (status + stable error code) hard-redirects to `/auth/logout?code=access_revoked`.
2. An **expired** access token triggers a refresh through a **single-flight queue** — module-scoped
   `isRefreshing`, `refreshPromise` and `failedQueue` — so N concurrent 401s produce exactly one
   `POST /auth/refresh-tokens`, and every queued request replays with the new token.
3. Everything else rejects with the API error envelope, or the raw error when there is no response.
   A network failure never resolves to `undefined`.

Expiry and revocation are detected by **HTTP status plus a machine-readable code**
(`AUTH_ERROR_CODES` in `services/base.ts`) — never by matching message strings.

### Server state vs client state

- **Server state:** TanStack Query only. `lib/react-query.ts` holds a lazily-created `QueryClient`
  singleton (`staleTime: 30s`, no refetch on focus). Every endpoint is a `use<Verb><Noun>` hook in
  `services/<domain>.services.ts` with exported query keys (`authKeys`, `tradeKeys`).
- **Client state:** Zustand. `store/auth.store.ts` persists the session to `localStorage` under
  `kumtru-auth-store`. Server data is never duplicated into Zustand.

Because the session lives in `localStorage`, anything auth-dependent must be gated on `hydrated`, or
it will mismatch on hydration. `waitForHydration()` exists for imperative callers.

### Styling

Tailwind CSS v4, **CSS-first — there is no `tailwind.config.ts`**. Design tokens live in `@theme` in
`src/app/globals.css` and generate utility classes:

```
bg-kumtru-navy   text-kumtru-slate-500   bg-kumtru-success-soft   text-kumtru-risk-on-soft
```

Rules that matter:

- **No raw hex in components.** Use the token classes; every one has a dark-mode counterpart.
- Semantic state colours come in `--color-kumtru-<state>` / `-soft` / `-on-soft` triples, so a soft
  surface always has a foreground that passes contrast on it.
- shadcn primitives live in `components/ui` and stay free of app logic. `Button` is re-themed in
  place — `default` is brand indigo, `trust` is emerald for money-moving actions, `brand` is navy,
  and an `xl` size was added.
- Compose classes with `cn()`; never string-concat conditionals.

Type: Space Grotesk (display), Inter (body), IBM Plex Mono (trade codes and amounts).

### Forms

Formik + Yup. One `Yup.object({...})` schema per page, declared above the component. `handleSubmit`
awaits the service's `mutateAsync`, sets a local `error` string in `catch`, and clears
`setSubmitting(false)` in `finally`. API errors show **both** inline (`FormError`) and as a toast
(`useCustomToast`).

## Directory layout

```
src/
  app/
    layout.tsx              root: metadata, viewport, providers, Toaster, SW registrar
    globals.css             Tailwind v4 @theme tokens + shadcn vars + mobile base
    fonts.ts                next/font/google exports
    offline/                SW navigation fallback — no shell, no session
    (marketing)/            landing, privacy, terms
    (authentication)/       login, register, verify, logout, 2FA, password reset
    (app)/                  auth-gated mobile shell: trades, passport, alerts, settings
  components/
    ui/                     shadcn primitives + FloatingLabelInput, Spinner, DatePicker, MultiSelect
    general/
      app/                  shell primitives: tab bar, headers, sticky actions, empty state,
                            settings rows, initials avatar
      trade/                trade-row, trade-timeline
      pwa/                  service-worker registrar, install prompt
      brand-mark, safety-callout, trust-status-chip, marketing-navbar
    forms/                  reusable form widgets
    query-provider.tsx
    theme-provider.tsx
  config/navigation.tsx     bottom tab bar + marketing nav
  helpers/                  money, timezones, trade status mapping, error mapping
  hooks/                    use-mobile, useCustomToast, useRowLoading, useDeviceTimeZone
  interfaces/               IAxios.ts, auth.ts, trade.ts
  lib/                      react-query.ts, utils.ts
  services/                 base.ts (facade) + auth/trade services
  store/auth.store.ts
  middleware.ts
```

## Frame vs. modules

**Built and working (the frame):**

- Mobile shell, bottom tab navigation, safe-area handling, light/dark theming
- PWA: manifest, service worker, install prompt, offline fallback
- HTTP facade, single-flight token refresh, error envelope handling
- Auth end to end: login, register, email verification, password reset, 2FA challenge + setup, logout
- Session store with hydration gating
- Composition primitives features should render: `TradeRow`, `TradeTimeline`, `TrustStatusChip`,
  `SafetyCallout`, `EmptyState`, `StickyActionBar`, `ScreenHeader` / `TabHeader`, settings rows
- Read-only `useListTrades` / `useTradeByCode` as the canonical service-hook example

**Not built — awaiting module prompts:**

| Module         | Screens it owns                                                               |
| -------------- | ----------------------------------------------------------------------------- |
| Trades         | Trade list, agreement summary + fund, active trade timeline, confirm delivery |
| Trust Passport | Real stats, badges, shareable passport                                        |
| Alerts         | Notification feed and read state                                              |
| Disputes       | Report an issue, dispute status, evidence submission                          |
| Messaging      | Trade-scoped chat                                                             |
| Settings       | Everything that writes — notification prefs, trusted devices                  |

The four tab screens currently render honest empty states. **No screen fabricates data**, and no
toggle pretends to save.

## Domain model

Two linked entities: `IAuth` (credentials, verification, 2FA) and `IUser` (profile, preferences).
There is **no tenant/workspace concept** — this is a consumer app and a customer has an account, not
an organisation.

Branching results are discriminated unions, so a caller cannot read a field that does not exist on
the branch it received:

```ts
type LoginResultInterface =
  | ({ requires2FA: true; challengeId: string; method: TwoFactorMethodEnum } & AccountBundle)
  | ({ requires2FA: false; tokens: Access } & AccountBundle);
```

The trade lifecycle is a state machine (`TradeStatusEnum`): `DRAFT → OPEN → AGREED → PROTECTED →
IN_PROGRESS → FULFILLED → COMPLETED → SETTLED`, plus `CANCELLED`, `DISPUTED`, `EXPIRED`, `REFUNDED`.
Customers never see those names — `helpers/tradeStatus.ts` maps them to trust language ("Protected",
"Awaiting action", "At risk") in exactly one place.

**Money is always integer minor units (kobo).** Only presentation divides by 100, via
`helpers/numbers.ts`. No floats anywhere near an amount.

### Safety copy is part of the product

Kumtru will never ask anyone to pay outside an active trade, share a one-time code, or send money to
a personal account. That warning appears via `SafetyCallout` **at the point the risky action would be
taken**, not buried in a help centre. Trades are found by typing a **code**, never by opening a link
someone sent.

## Deployment

```bash
pnpm build
pnpm start        # pm2, app name `kumtru-ui`, port 3100
```

`ecosystem.config.json` and `package.json` share the same app name and port — keep them in sync if
either changes.

Serve over HTTPS in production: service worker registration and `beforeinstallprompt` both require a
secure origin.

## Known gaps

- `public/og-kumtru.png` and the icon set are generated placeholders built from the brand mark.
  Colour and geometry are correct, but the OG wordmark is a bitmap approximation, not Space Grotesk —
  replace with design-produced assets before launch.
- `privacy` and `terms` are drafted templates. Have counsel review them per market.
- The single-flight refresh queue is verified by construction and code review, not by an executed
  test — the scaffold spec forbids adding a test framework. Worth a runtime test before launch.
- The backend currently exposes only `appSettings`, so auth and trade endpoints must be built there
  before these screens do anything against real data.
