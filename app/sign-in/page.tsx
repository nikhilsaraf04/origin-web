// Passcode sign-in. Origin is a single-user personal app, so instead of
// email magic links we ask for one shared passcode, exchange it at
// /api/auth for an httpOnly session cookie, and bounce home.
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type State =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "error"; message: string };

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInInner />
    </Suspense>
  );
}

function SignInInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [passcode, setPasscode] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = passcode.trim();
    if (!trimmed) {
      setState({ kind: "error", message: "Enter your passcode." });
      return;
    }
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passcode: trimmed }),
      });
      if (res.status === 401) {
        setState({ kind: "error", message: "Incorrect passcode." });
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setState({
          kind: "error",
          message: body?.error || "Could not sign in. Try again.",
        });
        return;
      }
      // Cookie is set by the response; go where they were headed.
      router.replace(next);
      router.refresh();
    } catch {
      setState({ kind: "error", message: "Network error. Try again." });
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-s5 bg-bg-0">
      <div className="w-full max-w-sm flex flex-col gap-s5">
        <header className="flex flex-col gap-[2px]">
          <h1 className="font-display text-[36px] text-ink-1 leading-none">
            Origin
          </h1>
          <span
            className="font-ui text-[10px] uppercase text-ink-3"
            style={{ letterSpacing: "0.1em" }}
          >
            Enter passcode to sync your library
          </span>
        </header>

        <form onSubmit={submit} className="flex flex-col gap-s4">
          <label className="flex flex-col gap-s2">
            <span
              className="font-ui text-[10px] uppercase text-ink-4"
              style={{ letterSpacing: "0.1em" }}
            >
              Passcode
            </span>
            <input
              type="password"
              autoComplete="current-password"
              spellCheck={false}
              placeholder="••••••••"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              disabled={state.kind === "sending"}
              autoFocus
              className="bg-bg-2 border border-line-2 rounded-r2 px-s3 py-s3 text-[14px] text-ink-1 placeholder:text-ink-4 font-ui"
            />
          </label>

          <button
            type="submit"
            disabled={state.kind === "sending" || !passcode.trim()}
            className="bg-accent text-accent-ink font-ui font-medium text-[12px] uppercase rounded-r2 py-[14px] disabled:opacity-40"
            style={{ letterSpacing: "0.1em" }}
          >
            {state.kind === "sending" ? "Signing in…" : "Sign in"}
          </button>

          {state.kind === "error" && (
            <p className="font-ui text-[12px] text-red-400">{state.message}</p>
          )}
        </form>

        <p className="font-ui text-[10px] text-ink-4 leading-relaxed">
          One passcode unlocks sync across web and iOS. No email, no password
          reset — your library is the same everywhere.
        </p>
      </div>
    </main>
  );
}
