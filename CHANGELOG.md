# Origin Web — Changelog

All notable changes to this project are documented here.
Format: `vMAJOR.MINOR.PATCH — description`

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
