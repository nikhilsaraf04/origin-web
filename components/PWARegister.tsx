"use client";

import { useEffect } from "react";

// Registers the service worker after the page loads. No-op on the server and
// on browsers without service-worker support (older iOS still installs the
// PWA from the manifest + apple meta tags without one).
export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registration failures are non-fatal — the app still works online */
      });
    };

    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
