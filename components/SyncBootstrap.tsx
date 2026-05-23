// Mounts once at the root of the app and kicks off the Supabase sync
// service. Kept as a tiny client island so the rest of the layout can
// stay a Server Component.
"use client";

import { useEffect } from "react";
import { syncService } from "@/lib/supabase/sync-service";

export function SyncBootstrap() {
  useEffect(() => {
    syncService.start();
  }, []);
  return null;
}
