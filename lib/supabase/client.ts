// Browser-side Supabase client. Reads NEXT_PUBLIC_SUPABASE_URL +
// NEXT_PUBLIC_SUPABASE_ANON_KEY (publishable key is fine — RLS protects
// the data). Cookies are managed by @supabase/ssr so the server can also
// see the session (used by the /auth/callback route).
//
// We deliberately memoize the client per-window so multiple components
// share the same auth listener and don't double-subscribe to realtime.

"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env vars missing — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  cached = createBrowserClient(url, key);
  return cached;
}
