# Origin Web — Changelog

All notable changes to this project are documented here.
Format: `vMAJOR.MINOR.PATCH — description`

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
