# Origin Web — Changelog

All notable changes to this project are documented here.
Format: `vMAJOR.MINOR.PATCH — description`

---

## v0.6.0 — Live camera scanning (2026-07-17)

The web scan screen now has a live rear-camera viewfinder, matching the
native iOS app: point at a bag, tap the shutter, Claude reads the label.
Upload, drag-drop, and URL scans remain as fallbacks.

### Added

- **`getUserMedia` viewfinder** in `components/screens/ScanScreen.tsx` —
  requests the rear camera (`facingMode: environment`), streams into a
  full-bleed `<video>` (muted + `playsInline` for iOS), and a shutter button
  grabs the current frame via canvas → JPEG blob → the existing `/api/scan`
  path. Torch toggle shown only where `MediaTrackCapabilities.torch` exists
  (Android Chrome; iOS rarely).
- **Scan frame** — corner-bracket overlay (web analogue of `ScanFrame.swift`)
  and a "Point camera at bag" idle prompt with shutter + Upload + Simulate.

### Changed

- Camera lifecycle: starts on mount, freezes on capture while Claude reads,
  resumes on "Try again", and stops on unmount (tracks released).
- Graceful degradation: permission denied or no device / insecure context
  falls back to the upload dropzone with a clear prompt.

---

## v0.5.0 — Installable PWA (2026-07-17)

The web app can now be installed to the iPhone/Android home screen and runs
full-screen like a native app — no App Store, no Xcode, no signing. Same
Fly backend, same passcode login, same synced library.

### Added

- **Web app manifest** (`public/manifest.webmanifest`) — standalone display,
  Nordic Zen theme/background (`#0C1017`), name/short-name/description.
- **Icons** (`public/icons/*`, `public/apple-touch-icon.png`) — 192/512 +
  512 maskable + 180 apple-touch, a slate-blue coffee bean on fjord-night,
  generated to match the app's design tokens.
- **Service worker** (`public/sw.js`) — cache-first for static assets,
  network-first for navigations, and API traffic (`/api/*`) never cached so
  auth + sync stay live. Registered client-side via
  `components/PWARegister.tsx`.
- **PWA metadata** in `app/layout.tsx` — `manifest`, `appleWebApp` (capable,
  title, status-bar style), icon links, and a `viewport` export with
  `themeColor` + `viewport-fit: cover`.

### Fixed

- **Dockerfile** now copies `public/` into the runtime image. The prior
  non-standalone image never shipped `public/`, so any static asset served
  from it (now the manifest, icons, and service worker) would 404 in prod.

---

## v0.4.0 — Self-hosted backend on Fly (off Supabase) (2026-07-06)

Supabase (project `tohgsibktcteoghayndt`) was deleted after free-tier
inactivity, which broke sign-in on both web and iOS. Replaced it with a
self-hosted backend on the existing Fly app so nothing can pause or
disappear again. Single-user by design (Nikhil across his devices).

### Added

- **SQLite backend** (`lib/db.ts`) on a Fly volume mounted at `/data`.
  `coffee_logs` table mirrors the former Supabase schema; array columns
  stored as JSON text, booleans as 0/1, (de)serialized at the API edge.
- **Passcode auth** (`lib/auth.ts`, `lib/auth-edge.ts`) — one shared
  passcode (`ORIGIN_PASSCODE`) exchanged at `POST /api/auth` for an
  HMAC-signed bearer token (`ORIGIN_TOKEN_SECRET`). No email, no SMTP.
  Node routes verify via `node:crypto`; middleware verifies via Web
  Crypto (Edge runtime can't use `node:crypto`).
- **Sync API** (`app/api/logs/route.ts`) — `GET /api/logs?since=` (pull)
  and `POST /api/logs` (upsert, last-write-wins on `updated_at`). Auth
  via bearer header (iOS) or `origin_token` cookie (web).

### Changed

- **Sync service** (`lib/sync-service.ts`) now fetches `/api/logs`
  instead of the Supabase client. Same pull-then-push + per-write upsert
  strategy and LWW semantics.
- **Sign-in** (`app/sign-in/page.tsx`) is now a passcode form that posts
  to `/api/auth` and sets an httpOnly session cookie.
- **Middleware** gates on the signed token cookie (no Supabase session
  refresh).
- **Dockerfile** builds `better-sqlite3` (native) and runs a full
  `next start` (non-standalone) so the compiled binary is always
  present; runs as root to write the volume.
- **fly.toml** mounts the `origin_data` volume at `/data`; drops the
  Supabase build args/env.

### Removed

- `@supabase/ssr` + `@supabase/supabase-js`, `lib/supabase/*`, the
  `/auth/callback` magic-link route, and the `NEXT_PUBLIC_SUPABASE_*`
  Fly secrets.

---

## v0.3.0 — Cross-device sync via Supabase (2026-05-23)

Wires the web app to a Supabase backend so coffee logs sync across web
and iOS. Local cache stays the source of truth; the sync layer pushes
and pulls deltas with last-write-wins conflict resolution.

### Added

- **Supabase client** (`lib/supabase/client.ts`, `lib/supabase/server.ts`)
  using `@supabase/ssr`. Reads `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Cookies are shared with route handlers
  + middleware so server components see the active session.
- **Sync service** (`lib/supabase/sync-service.ts`) — pulls rows newer
  than `lastSyncAt`, merges into Zustand by `updated_at`, then upserts
  any local rows newer than `lastPushAt`. Runs on start, sign-in,
  `focus`, and `visibilitychange`. Every local write also fires an
  async upsert; failures are silently queued until the next focus.
- **Magic-link sign-in** at `/sign-in` (`app/sign-in/page.tsx`) with
  email input, "Send magic link" CTA, and a 30-second resend cooldown.
- **Auth callback route** at `/auth/callback` (`app/auth/callback/route.ts`)
  that exchanges the OTP code for a session and redirects to `?next=`
  (defaults to `/`).
- **Auth-gating middleware** (`middleware.ts`) — refreshes the Supabase
  session on every request, redirects unauthenticated users to
  `/sign-in?next=…`, and bounces signed-in users away from `/sign-in`.
  `/api/*` stays public.
- **`SyncBootstrap`** client island mounted in the root layout to call
  `syncService.start()` once per app load.
- `.env.example` and `README.md` document the two new env vars and the
  one-time Supabase **Auth → URL Configuration** step
  (`https://origin-coffee.fly.dev/auth/callback` +
  `http://localhost:3000/auth/callback`).

### Changed

- **`CoffeeLog`** gained `updatedAt` (stamped on every write) and
  `deletedAt` (set on remove). `scanResultToCoffeeLog` initialises
  both.
- **`coffee-store.ts`** rewritten around `allLogs` (everything,
  including tombstones) with a `logs` selector that filters live rows.
  `save`/`update`/`remove` now stamp `updatedAt`, mark deletes as
  tombstones, and fire async upserts. A new `setAllFromRemote` action
  merges pulled rows by last-write-wins. Legacy localStorage payloads
  (under `logs`) are migrated to `allLogs` on rehydrate.

### Notes

- The publishable key (`sb_publishable_…`) is used in
  `@supabase/supabase-js` ≥ 2.46 — falls back to the legacy anon JWT if
  the publishable key is rejected by older SDK builds.
- **`bag_photo_url` is intentionally skipped** in v1 — bag photos stay
  in localStorage as data URLs. Cross-device photo sync is a v2
  follow-up (needs Supabase Storage + image compression).
- Service-role keys are **never** referenced. Only the publishable /
  anon key is exposed to the browser; RLS protects per-user data.

---

## v0.2.0 — Match mode + URL matching (2026-05-23)

Brings the new iOS "match scan" mode to the web and adds a web-only URL-based
matching path.

### Added

- **Match scan mode** on `/scan` — a top-of-page toggle picks between
  **Add to library** (existing flow → `/review`) and **Check match** (new
  flow → `/match`).
- **`/match` route** (`app/match/page.tsx`, `components/screens/MatchScreen.tsx`)
  — shows the bag's attributes, a match-score badge, the reason highlights,
  and **Done** / **Save anyway** actions. Reuses `OMatchBadge`, `OChip`,
  `OLabel`, `CoffeeBagPhoto` and `lib/services/match-score.ts`.
- **URL-based matching (web-only)** — paste a roastery product-page URL on
  `/scan` instead of uploading a photo. URL scans always route to `/match`
  since they are inherently pre-purchase.
- **`POST /api/match-url`** (`app/api/match-url/route.ts`) — takes
  `{ url }`, returns the same `ScanResult` JSON shape as `/api/scan`.
- **`lib/services/match-url.ts`** — server-only helper. Validates the URL
  (http/https), fetches with the `OriginCoffee/0.2` User-Agent, enforces a
  **10s timeout** and a **2MB response cap**, strips HTML to text with a
  dependency-free inline stripper, then calls Claude Opus 4.7 with the same
  JSON contract as the vision scanner.
- **Empty state on `/match`** when `TasteProfile` isn't ready (fewer than 5
  logs) — shows "Log N coffee(s) to unlock match scoring" instead of a
  bogus 0% score.

### Changed

- `lib/store/coffee-store.ts` — added a transient `pendingScan` slot (not
  persisted) so **Save anyway** on `/match` can hand off to `/review` with
  prefilled data.
- `lib/services/claude-vision.ts` — extracted `ANTHROPIC_ENDPOINT`,
  `ANTHROPIC_MODEL`, `ANTHROPIC_VERSION`, `extractJSON`, and
  `buildScanResult` so the URL extractor can reuse them.
- `components/screens/ScanScreen.tsx` — added the mode toggle, URL input
  pane, and dual routing (`/match` vs `/review`).

### Notes

- The HTML-to-text conversion is intentionally inline (no `node-html-parser`
  dependency) — script/style/svg/comments are stripped, common entities are
  decoded, whitespace is collapsed, and the text is capped before being sent
  to Claude.

---

## v0.1.0 — Web port (2026-05-23)

Initial Next.js port of the iOS app with full v1 feature parity.

### Added

- **Next.js 15 + App Router** scaffold (TypeScript, Tailwind CSS).
- **Design tokens** (`lib/design-tokens.ts`, `tailwind.config.ts`) — mirrors
  `Origin/Design/DesignTokens.swift` exactly (palette, type scale, spacing,
  radii, motion, bag color variants).
- **Flavor taxonomy** (`lib/flavor-taxonomy.ts`) — 72 canonical tags across
  15 groups, ported verbatim from `FlavorTaxonomy.swift`.
- **Data types** (`lib/types/models.ts`, `lib/types/taste-profile.ts`) —
  `CoffeeLog`, `ScanResult`, `TasteProfile`, and all enums (`CoffeeProcess`,
  `RoastLevel`, `BrewMethod`, `BodyLevel`, `AcidityLevel`). `computeTasteProfile`
  ports the full ranking + normalization logic.
- **Services**
  - `lib/services/claude-vision.ts` — Anthropic `/v1/messages` client using
    `claude-opus-4-7`. Same prompt and JSON contract as the iOS app.
  - `lib/services/match-score.ts` — bit-exact port of `MatchScoreService.swift`.
  - `lib/services/roaster-info.ts` — Claude Haiku enrichment.
- **API routes** — `/api/scan` (POST, multipart) and `/api/roaster` (GET).
  Holds the Anthropic key server-side; the browser never sees it.
- **Zustand store** (`lib/store/coffee-store.ts`) — `persist` middleware
  writes to `localStorage` under key `origin-web/v1`.
- **Components** — `OLabel`, `OChip`, `OMatchBadge`, `ORating`, `OBarChart`,
  `CoffeeBagPhoto`, `OriginTabBar`.
- **Screens**
  - **Library** (`/`) — header, filter strip, coffee rows, empty state.
  - **Scan** (`/scan`) — file upload + drag-and-drop, detected-fields overlay,
    simulate button. (Live camera is on the v2 roadmap.)
  - **Review** (`/review`) — all bag fields, rating slider, brew method,
    flavor picker, notes, dates, save bar.
  - **Detail** (`/detail/[id]`) — match badge, chips, notes, rating + brew,
    roaster info pulled from `/api/roaster`, edit/delete.
  - **Palette** (`/palette`) — summary stats, top origins / roast / process /
    flavors / varieties, locked state until 5 logs exist.
- `.env.example` documenting `ANTHROPIC_API_KEY`. `.env.local` is gitignored.
- `README.md` covering setup, env-vars, Vercel deploy notes, architecture.

### Notes

- Persistence uses `localStorage` only — no backend DB in v1.
- Live camera capture is intentionally deferred; web v1 takes uploads only.
- Photos are stored as base64 data URLs inside the log; consider migrating to
  IndexedDB or a CDN if libraries grow beyond ~5MB.
