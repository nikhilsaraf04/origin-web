// Mounts once at the root of the app and kicks off the sync service. Kept
// as a tiny client island so the rest of the layout can stay a Server
// Component.
"use client";

import { useEffect } from "react";
import { syncService } from "@/lib/sync-service";

export function SyncBootstrap() {
  useEffect(() => {
    syncService.start();
  }, []);
  return null;
}
