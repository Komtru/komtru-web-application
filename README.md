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
| `NEXT_PUBLIC_WS_BASE_URL`        | Socket.IO origin for realtime notifications and trade updates.          |
| `NEXT_PUBLIC_WS_PATH`            | Socket.IO handshake path. Must match the backend's `SOCKET_PATH`.       |
| `NEXT_PUBLIC_TERMS_VERSION`      | Terms version recorded against each signup. Bump when terms change.     |
| `NEXT_PUBLIC_APP_URL`            | Public origin of this app; drives `metadataBase` and OG image URLs.     |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | reCAPTCHA v2 site key.                                                  |

## Mobile-first, literally

The layout is designed at phone width and **centred in a column** on larger screens (`max-w-[480px]`
with side borders), rather than growing a sidebar it would never have on the device most customers
actually use. There is no desktop shell and no sidebar primitive in this repo.

### The shell is sized to the usable height, not the document

`(app)` renders a column that is **exactly `--app-height` tall and does not scroll**. Only `<main>`
scrolls, so the header stays welded to the top edge and the tab bar sits snug on the bottom edge of
what the browser actually leaves visible.

- `--app-height` is written to `<html>` by `hooks/use-viewport-height.ts`, measured from
  `visualViewport.height`. `100dvh` is the pre-paint fallback and is close, but it is the height
  with browser chrome _retracted_ — mid-scroll on a phone the shell would be taller than the screen
  and the bar would sit below the fold.
- **It is not remeasured while the keyboard is open.** If it were, the column would collapse to the
  space above the keyboard and drag the tab bar on top of the field being typed into. The hook
  reports `keyboardOpen` instead and the shell hides the bar for the duration — the same outcome a
  native app gets by letting the keyboard cover it, without the jump.
- Safe-area insets still apply on both edges (`env(safe-area-inset-top)` on the header,
  `env(safe-area-inset-bottom)` on the tab bar), so nothing lands under the notch or the home
  indicator.

Chrome above that: a **header** (drawer trigger, brand, alerts bell with live unread count) and an
**openable sidebar** — a left `Sheet` that overlays rather than pushes, so the column width never
changes and the tab bar stays where the thumb left it. The drawer deliberately is _not_ a second
copy of the tab bar: the four constant destinations already have permanent thumb-reachable slots, so
it carries account, security, statements, help and legal instead.

What mobile-first means elsewhere:

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

| Group              | Owns                                           | Shell                                                   |
| ------------------ | ---------------------------------------------- | ------------------------------------------------------- |
| `(marketing)`      | `/`, `/privacy`, `/terms`                      | Dark navy, floating pill navbar, footer                 |
| `(authentication)` | `/auth/*`                                      | Single column on mobile; brand panel appears at `lg`    |
| `(app)`            | `/trades`, `/passport`, `/alerts`, `/settings` | App shell: header + drawer + bottom tab bar, auth-gated |

App routes sit at the root (`/trades`, not `/dashboard/trades`) to match the URLs in the screens
guide. `src/app/offline/` is outside every group — it must render with no shell and no session.

`(authentication)` owns `/auth/login`, `/auth/register`, `/auth/verify` (the OTP screen),
`/auth/2fa`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/logout` and
`/auth/social/[provider]/callback`.

`src/middleware.ts` is deliberately a **pass-through**. Tokens live in `localStorage`, which
middleware cannot read, so guarding routes there would be theatre. `(app)/layout.tsx` redirects
client-side on `hydrated && !accessToken`, and the API enforces access for real on every request.

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

### Authentication

Every contract in `interfaces/auth.ts` is mirrored from `backend-apis/src/modules/identity`. The
shapes that drive the screens:

| Flow           | Endpoints                                                                               |
| -------------- | --------------------------------------------------------------------------------------- |
| Register       | `POST /auth/register` → `POST /auth/verify-otp`                                         |
| Sign in        | `POST /auth/login` → (`POST /auth/mfa/verify` if `mfaRequired`)                         |
| Password reset | `POST /auth/password/forgot` → `POST /auth/password/reset`                              |
| Social         | `GET /auth/providers`, `GET /auth/social/:p/authorize`, `POST /auth/social/:p/callback` |
| Session        | `POST /auth/refresh`, `POST /auth/logout`, `GET /me`                                    |

Things about this API that shape the UI, and are easy to get wrong:

- **Registration returns no tokens.** A user who has not proven control of a channel gets no
  session, so `/auth/register` hands off to `/auth/verify` with a `challengeId` and the account only
  becomes usable once the OTP is redeemed.
- **`identifier` is one field** for email, phone _or_ username, and the client must not guess which.
- **Every credential failure is the same 401** — unknown, wrong, revoked, expired, suspended. So is
  every `password/forgot` response, whether or not the account exists. Copy that implied otherwise
  would hand back the answer the endpoint withholds.
- **One channel per registration.** Sending `phone` alongside `channel: 'EMAIL'` is a 400, not an
  ignored field — the API's Joi schemas have no `.unknown()`.
- **Password rules are length-only** (≥10). No composition rules, because forced symbols produce
  `Password1!` at scale; the API checks a breach corpus instead and explains itself in the 400.
- **Google/Apple redirect back to _this_ app**, at `/auth/social/[provider]/callback`, because the
  API's own callback is a `POST`. That URL is what must be registered with the provider.
- **The refresh token lives in `localStorage`, not the cookie.** The API does set an HttpOnly
  cookie, but it is scoped to `/v1/auth` on the API's origin and this app calls a same-origin `/api`
  proxy, so the browser never sends it. The body path is the one the API offers mobile clients.

### Onboarding: the username gate

`GET /me` returns a `nextStep`. Exactly one value blocks: **`CHOOSE_USERNAME`** renders
`UsernameGate` _instead of_ the app shell — no tab bar, no drawer, nothing to tap past. The other two
(`ADD_SECOND_CHANNEL`, `SET_PASSWORD`) surface as a drawer prompt, because the API is explicit that a
user with one verified channel can browse and buy.

`SessionBoundary` owns that decision and the `GET /me` sync, so a stale persisted `nextStep` is
corrected by the server rather than trusted. It reads the value from the store, not straight off the
query, so login and OTP verification (which both return `nextStep` themselves) put the gate up on the
first paint instead of flashing the shell.

The field is a live availability check against `GET /usernames/availability`, and its shape is
dictated by that endpoint:

- **20 checks per minute, per actor.** Hence a 450ms debounce, no request until the local format
  check passes, and a 60s `staleTime` so backtracking over a candidate costs nothing. A
  check-per-keystroke burns the budget in three seconds and then 429s the user mid-word.
- **`USERNAME_PATTERN` is mirrored** in `interfaces/auth.ts` to avoid round-trips on input that
  cannot be valid — but only the server knows about reserved namespaces, blocked terms, quarantine
  and confusability, so its answer wins. Uppercase and whitespace are corrected on input rather than
  rejected, since neither is ever valid.
- **The verdict tracks the field, not the last completed request.** Otherwise a stale "Available"
  sits under an edited handle and the submit button lies.
- **Suggestions come back pre-verified as claimable**, so tapping one lands on a handle that will not
  bounce.
- **A 409 on claim is expected.** `POST /me/username` re-checks inside its own transaction, so the
  handle can go in the gap — the form re-runs the check rather than leaving a dead button.

`POST /me/username` is the first claim: unrestricted. `PATCH /me/username` is a rename and carries
step-up, a 30-day cooldown, a lifetime cap of three and a block while any trade is live — which is
why the gate says so up front.

### Auth interceptors

Requests attach `Bearer <access token>` from the auth store, unless a caller set `Authorization`
explicitly. Responses share one error handler, attached to both instances:

1. A **401** on a non-bypassed path triggers a refresh through a **single-flight queue** —
   module-scoped `isRefreshing`, `refreshPromise` and `failedQueue` — so N concurrent 401s produce
   exactly one `POST /auth/refresh`, and every queued request replays with the new token.
2. If that refresh also fails, the session is over: hard-redirect to `/auth/logout?code=session_ended`.
   There is no second attempt, because the API gives the client no way to tell an expired token from
   a revoked one — and by design.
3. Everything else rejects with the API error envelope, or the raw error when there is no response.
   A network failure never resolves to `undefined`.

A **403** never triggers a refresh: it is an authorisation answer about a session that is valid.

### Server state vs client state

- **Server state:** TanStack Query only. `lib/react-query.ts` holds a lazily-created `QueryClient`
  singleton (`staleTime: 30s`, no refetch on focus). Every endpoint is a `use<Verb><Noun>` hook in
  `services/<domain>.services.ts` with exported query keys (`authKeys`, `tradeKeys`).
- **Client state:** Zustand. `store/auth.store.ts` persists the session to `localStorage` under
  `kumtru-auth-store`: tokens, the small `UserSummary` every session response carries, the fuller
  `GET /me` view and `nextStep`. Server data is not otherwise duplicated into Zustand.

Because the session lives in `localStorage`, anything auth-dependent must be gated on `hydrated`, or
it will mismatch on hydration. `waitForHydration()` exists for imperative callers.

### Realtime

One Socket.IO connection per session, owned by `realtime/socket-provider.tsx` and mounted once from
`(app)/layout.tsx` — never per-page, never per-component, and never for a logged-out visitor (the
layout holds back the whole subtree until `hydrated && accessToken`, so the provider is not reached
at all before then).

- **Credential:** the app's own access token, read from the auth store. There is no separately
  minted socket token, because there is no server-side session to mint one from — tokens live in
  `localStorage` and the shell is a Client Component. The backend must verify the handshake token
  with the same secret it uses for `Authorization: Bearer`.
- **Token refresh does not drop the connection.** The token is read through a ref by socket.io's
  function-form `auth`, which re-runs on every connection attempt, so reconnects present a current
  credential while a healthy connection is left alone.
- **Consuming:** `useSocketEvent(event, handler)` subscribes and cleans up on unmount (no
  `useCallback` needed); `useNotifications()` gives `unreadCount` / `notifications` / `markAllRead`;
  `useSocketReconnect(fn)` runs after the connection comes back, but not on first connect.
- **A live event is a hint, never the source of truth.** The in-memory buffer is capped at 50 and
  history stays behind the API; on reconnect the notification provider invalidates active queries
  rather than assuming nothing was missed.

What a notification _means_ and how it renders belongs to the Notifications module, not here.

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
    (authentication)/       login, register, OTP verify, 2FA, password reset, social callback,
                            logout
    (app)/                  auth-gated mobile shell: trades, passport, alerts, settings
  components/
    ui/                     shadcn primitives + FloatingLabelInput, Spinner, DatePicker, MultiSelect
    general/
      app/                  shell: app-shell, header, sidebar, tab bar, screen headers,
                            sticky actions, empty state, settings rows, avatar, verification chip
      trade/                trade-row, trade-timeline
      pwa/                  service-worker registrar, install prompt
      brand-mark, safety-callout, trust-status-chip, marketing-navbar
    forms/                  reusable form widgets
    query-provider.tsx
    theme-provider.tsx
  config/navigation.tsx     bottom tab bar + marketing nav
  helpers/                  auth (device id, MFA hand-off, redirect URIs), money, timezones,
                            trade status mapping, error mapping
  hooks/                    use-viewport-height, use-mobile, useCustomToast, useRowLoading,
                            useDeviceTimeZone
  interfaces/               IAxios.ts, auth.ts, trade.ts, realtime.ts
  lib/                      react-query.ts, utils.ts
  realtime/                 socket provider + hooks, notification provider
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
