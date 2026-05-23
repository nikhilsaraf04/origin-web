// Magic-link sign-in. Matches the dark-theme look — input + submit + a
// "check your inbox" state with a 30s resend cooldown so users can't
// hammer Supabase if the first email goes to spam.
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type State =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; cooldown: number }
  | { kind: "error"; message: string };

const RESEND_SECONDS = 30;

export default function SignInPage() {
  const params = useSearchParams();
  const errorFromQuery = params.get("error");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>(
    errorFromQuery
      ? { kind: "error", message: prettyError(errorFromQuery) }
      : { kind: "idle" },
  );

  // Cooldown ticker for the "sent" state.
  useEffect(() => {
    if (state.kind !== "sent" || state.cooldown <= 0) return;
    const t = window.setTimeout(() => {
      setState((s) =>
        s.kind === "sent" ? { ...s, cooldown: s.cooldown - 1 } : s,
      );
    }, 1000);
    return () => window.clearTimeout(t);
  }, [state]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setState({ kind: "error", message: "Enter your email first." });
      return;
    }
    setState({ kind: "sending" });
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      setState({ kind: "sent", cooldown: RESEND_SECONDS });
    } catch (err) {
      setState({
        kind: "error",
        message: (err as Error).message || "Could not send the magic link.",
      });
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
            Sign in to sync your library
          </span>
        </header>

        {state.kind === "sent" ? (
          <SentPanel
            email={email}
            cooldown={state.cooldown}
            onResend={() => void send()}
          />
        ) : (
          <form onSubmit={send} className="flex flex-col gap-s4">
            <label className="flex flex-col gap-s2">
              <span
                className="font-ui text-[10px] uppercase text-ink-4"
                style={{ letterSpacing: "0.1em" }}
              >
                Email
              </span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                spellCheck={false}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={state.kind === "sending"}
                className="bg-bg-2 border border-line-2 rounded-r2 px-s3 py-s3 text-[14px] text-ink-1 placeholder:text-ink-4 font-ui"
              />
            </label>

            <button
              type="submit"
              disabled={state.kind === "sending" || !email.trim()}
              className="bg-accent text-accent-ink font-ui font-medium text-[12px] uppercase rounded-r2 py-[14px] disabled:opacity-40"
              style={{ letterSpacing: "0.1em" }}
            >
              {state.kind === "sending" ? "Sending…" : "Send magic link"}
            </button>

            {state.kind === "error" && (
              <p className="font-ui text-[12px] text-red-400">
                {state.message}
              </p>
            )}
          </form>
        )}

        <p className="font-ui text-[10px] text-ink-4 leading-relaxed">
          We&apos;ll email you a one-tap link to sign in. No password needed.
          Sessions sync across web and iOS so your library is the same
          everywhere.
        </p>
      </div>
    </main>
  );
}

function SentPanel({
  email,
  cooldown,
  onResend,
}: {
  email: string;
  cooldown: number;
  onResend: () => void;
}) {
  return (
    <div className="flex flex-col gap-s4">
      <div className="bg-bg-2 border border-line-2 rounded-r4 px-s4 py-s5 flex flex-col gap-s3">
        <span
          className="font-ui font-medium text-[10px] uppercase text-accent"
          style={{ letterSpacing: "0.1em" }}
        >
          Check your inbox
        </span>
        <p className="font-ui text-[13px] text-ink-1 leading-relaxed">
          We sent a magic link to{" "}
          <span className="text-accent">{email}</span>. Tap it to finish
          signing in.
        </p>
        <p className="font-ui text-[11px] text-ink-3">
          The link expires in 1 hour. If it doesn&apos;t show up, check spam.
        </p>
      </div>
      <button
        type="button"
        onClick={onResend}
        disabled={cooldown > 0}
        className="font-ui font-medium text-[12px] uppercase text-accent border border-[var(--accent-border)] rounded-r2 py-s3 disabled:opacity-40"
        style={{ letterSpacing: "0.1em" }}
      >
        {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend link"}
      </button>
    </div>
  );
}

function prettyError(raw: string): string {
  if (raw === "missing_code") return "Invalid sign-in link — try again.";
  return decodeURIComponent(raw);
}
