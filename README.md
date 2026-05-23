# Origin — Web

Web version of [Origin Coffee](https://github.com/nikhilsaraf04/origin-coffee).
A "Vivino for single-origin beans": scan a coffee bag, let Claude extract its
attributes, review and save it to your personal library, and watch your taste
profile (origins, processes, roast levels, flavor families) emerge over time.

This is a Next.js port of the SwiftUI + SwiftData iOS app. All design tokens,
flavor taxonomy, match-score algorithm, and the Claude Vision JSON contract
are mirrored exactly so the two clients stay in lock-step.

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** — tokens mirror `Origin/Design/DesignTokens.swift`
- **Zustand** (with `persist`) — saves logs to `localStorage`
- **Claude Vision** — server-side via `/api/scan` route handler
- Fonts: DM Sans (UI), IBM Plex Mono (mono), Shippori Mincho B1 (display)

## Setup

```bash
npm install
cp .env.example .env.local
# edit .env.local and set ANTHROPIC_API_KEY
npm run dev
```

Open <http://localhost:3000>. The library is empty until you scan a bag.

### Environment variables

- `ANTHROPIC_API_KEY` — your Anthropic API key. Used **server-side only** by
  `/api/scan` and `/api/roaster`. It must never reach the client; do not
  prefix it with `NEXT_PUBLIC_`. Get one at <https://console.anthropic.com/>.
- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL. Safe to expose.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase publishable / anon key. Safe to
  expose — RLS protects per-user data. **Never** use the service-role key
  here.

`.env.local` is gitignored. `.env.example` documents the shape.

### Cross-device sync (Supabase)

v0.3.0 wires the app to a Supabase backend so the same library shows on
web and iOS. The sync layer is **local-first**: Zustand + localStorage
stays the source of truth for the UI, and `lib/supabase/sync-service.ts`
pulls/pushes deltas to `public.coffee_logs` on startup, sign-in, and
every window focus. Conflicts are resolved last-write-wins by
`updated_at`; deletes are soft (`deleted_at` is set and the tombstone is
pushed). Auth is Supabase magic-link email.

After deploying for the first time, add both callback URLs to the
Supabase **Auth → URL Configuration** page so magic links land on the
right host:

- `https://origin-coffee.fly.dev/auth/callback`
- `http://localhost:3000/auth/callback`

**v2 follow-up:** `bag_photo_url` is currently skipped — bag photos stay
local-only as data URLs. Cross-device photo sync needs Supabase Storage
plus client-side image compression.

### Scripts

- `npm run dev` — start the dev server on port 3000
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run typecheck` — `tsc --noEmit` only
- `npm run lint` — Next.js lint

## Architecture

```
app/
  layout.tsx              root layout, fonts wired in
  page.tsx                Library
  scan/page.tsx           Scan (upload + drag-and-drop)
  review/page.tsx         Review the AI-extracted scan, save to library
  detail/[id]/page.tsx    Detail view for one coffee
  palette/page.tsx        Your Palate stats
  api/scan/route.ts       POST image → Claude Vision → ScanResult JSON
  api/roaster/route.ts    GET roaster blurb from Claude Haiku
components/
  OLabel, OChip, OMatchBadge, ORating, OBarChart, CoffeeBagPhoto,
  OriginTabBar — reusable, mirrors Origin/Components/*.swift
  screens/                full-screen views
lib/
  design-tokens.ts        Palette, TypeSize, Spacing, Radius, BagColors
  flavor-taxonomy.ts      72 canonical flavor tags
  types/models.ts         CoffeeLog, ScanResult, all enums
  types/taste-profile.ts  computeTasteProfile + ranking math
  services/claude-vision.ts  Anthropic /v1/messages client (server-only)
  services/match-score.ts    bit-exact port of MatchScoreService.swift
  services/roaster-info.ts   Anthropic Haiku enrichment (server-only)
  store/coffee-store.ts   Zustand store, persists to localStorage
```

### Data persistence

v1 uses `localStorage` via Zustand's `persist` middleware. No server DB.
Logs are keyed under the storage name `origin-web/v1`.

## Deploy to Vercel

1. Push to GitHub (already done — `nikhilsaraf04/origin-web`).
2. In the Vercel dashboard, "Add New Project" → import this repo.
3. Add **`ANTHROPIC_API_KEY`** under Project Settings → Environment Variables
   (mark it Production + Preview + Development).
4. Deploy. The default build command (`next build`) and output (`Next.js`)
   are picked up automatically.

## Roadmap (v2 ideas)

- Live camera capture (`getUserMedia`), matching the iOS scan flow.
- Optional cloud sync (Supabase or similar) so the same library shows on web
  and iOS.
- Image compression before upload to keep API costs down.
- Edit / undo affordances on the Detail screen for individual chips.

## License

Personal project — no license declared.
