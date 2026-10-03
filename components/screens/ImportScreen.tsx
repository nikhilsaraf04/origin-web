"use client";

// One-tap import of coffee-shop marks from a link: /import#d=<base64url JSON>.
// The payload rides in the URL fragment, so it never reaches the server logs.
// Nothing is written until the button is pressed, and re-pressing is safe:
// visits use the ids in the payload, and Best 100 marks are set, not toggled.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useBest100Marks } from "@/lib/store/best100-marks";
import { usePlaceStore } from "@/lib/store/place-store";
import { PlaceKindAll, type PlaceKind, type PlaceVisit } from "@/lib/types/place";

interface Payload {
  best100?: { id: string; visited?: boolean; note?: string; rating?: number }[];
  places?: {
    id: string;
    name: string;
    kind: PlaceKind;
    city: string;
    country: string;
    date: string;
    rating: number; // 0-100, 0 = unrated
    notes?: string;
  }[];
}

function decode(hash: string): Payload | null {
  const m = /(?:^#|&)d=([^&]+)/.exec(hash);
  if (!m) return null;
  try {
    const b64 = m[1].replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as Payload;
  } catch {
    return null;
  }
}

export function ImportScreen() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [checked, setChecked] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setPayload(decode(window.location.hash));
    setChecked(true);
  }, []);

  function apply() {
    if (!payload) return;
    const marks = useBest100Marks.getState();
    for (const b of payload.best100 ?? []) {
      const cur = marks.getMark(b.id);
      if (b.visited && !cur?.visited) marks.toggleVisited(b.id);
      const rating = b.rating && b.rating > 0 ? b.rating : (cur?.rating ?? 0);
      const note = b.note ?? cur?.note ?? "";
      marks.setNoteRating(b.id, note, rating);
    }
    const store = usePlaceStore.getState();
    for (const p of payload.places ?? []) {
      const existing = store.getVisit(p.id);
      const now = new Date().toISOString();
      const visit: PlaceVisit = {
        id: p.id,
        createdAt: existing?.createdAt ?? now,
        name: p.name,
        kind: PlaceKindAll.includes(p.kind) ? p.kind : "Other",
        city: p.city,
        country: p.country,
        dateVisited: p.date,
        drink: existing?.drink ?? "",
        flavorTags: existing?.flavorTags ?? [],
        rating: p.rating,
        wouldReturn: existing?.wouldReturn ?? true,
        notes: p.notes ?? existing?.notes ?? "",
      };
      store.save(visit);
    }
    setDone(true);
  }

  if (!checked) return null;

  const rows: string[] = [];
  for (const b of payload?.best100 ?? [])
    rows.push(`Best 100: ${b.id}${b.rating ? ` - ${b.rating}/10` : ""}`);
  for (const p of payload?.places ?? [])
    rows.push(
      `${p.name} (${p.kind}, ${p.city}) - ${p.rating > 0 ? `${p.rating / 10}/10` : "no rating yet"}`,
    );

  return (
    <main className="mx-auto max-w-md px-s5 pt-[60px] min-h-screen text-ink-1">
      <h1 className="font-display text-[32px] text-ink-1">Import marks</h1>
      {!payload ? (
        <p className="mt-4 text-sm opacity-70">This link has no marks in it.</p>
      ) : done ? (
        <>
          <p className="mt-4 text-sm">Done. {rows.length} marks saved.</p>
          <div className="mt-4 flex gap-4 text-sm underline">
            <Link href="/places">Places</Link>
            <Link href="/best100">Best 100</Link>
          </div>
        </>
      ) : (
        <>
          <ul className="mt-4 space-y-2 text-sm">
            {rows.map((r) => (
              <li key={r} className="border-b border-white/10 pb-2">
                {r}
              </li>
            ))}
          </ul>
          <button
            onClick={apply}
            className="mt-6 w-full rounded-r2 border py-3 font-ui text-[12px] text-ink-1"
          >
            Apply {rows.length} marks
          </button>
        </>
      )}
    </main>
  );
}
