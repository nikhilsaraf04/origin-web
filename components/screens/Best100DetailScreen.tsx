"use client";

import Link from "next/link";
import { useState } from "react";
import { OChip } from "@/components/OChip";
import { OLabel } from "@/components/OLabel";
import { useBest100Marks } from "@/lib/store/best100-marks";
import { editionChips, placeLine, type Best100Shop } from "@/lib/best100";

export function Best100DetailScreen({ shop }: { shop: Best100Shop }) {
  const mark = useBest100Marks((s) => s.marks[shop.id]);
  const toggleVisited = useBest100Marks((s) => s.toggleVisited);
  const setNoteRating = useBest100Marks((s) => s.setNoteRating);
  const [showEditor, setShowEditor] = useState(false);

  const headline = editionChips(shop)[0];

  return (
    <main className="min-h-screen pb-[160px] max-w-3xl mx-auto">
      <div className="px-s5 pt-[14px]">
        <Link
          href="/best100"
          className="inline-flex items-center gap-[6px] font-ui font-medium text-[11px] uppercase text-ink-3"
          style={{ letterSpacing: "0.08em" }}
        >
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Best 100
        </Link>
      </div>

      <div className="px-s5 mt-[6px]">
        <h1 className="font-display text-[36px] text-ink-1 leading-tight">{shop.name}</h1>
        {headline && (
          <div
            className="font-ui font-medium text-[10px] uppercase text-accent mt-1"
            style={{ letterSpacing: "0.14em" }}
          >
            {headline.label} #{headline.rank} · {placeLine(shop)}
          </div>
        )}

        <div className="flex flex-wrap gap-s2 mt-s4">
          {editionChips(shop).map((c) => (
            <OChip key={c.label} text={`${c.label} #${c.rank}`} highlighted={c.rank === 1} />
          ))}
          {shop.city && <OChip text={shop.city.toUpperCase()} />}
        </div>

        <div className="font-ui text-[11px] text-ink-3 mt-[6px]">{placeLine(shop)}</div>

        {shop.blurb && (
          <p className="font-ui text-[14px] text-ink-2 leading-[1.6] mt-s4">{shop.blurb}</p>
        )}

        {mark && (mark.visited || mark.note || mark.rating > 0) && (
          <div className="flex flex-col gap-[6px] mt-s4">
            {mark.rating > 0 && (
              <div className="flex items-center gap-s2">
                <OLabel text="Your rating" variant="accent" />
                <span className="font-mono text-[17px] text-accent">{mark.rating}</span>
              </div>
            )}
            {mark.note && (
              <div className="flex flex-col gap-[6px]">
                <OLabel text="Your note" />
                <p className="font-ui text-[12px] text-ink-2">{mark.note}</p>
              </div>
            )}
          </div>
        )}

        <div className="h-[0.5px] bg-line-1 mt-s5" />

        <button
          type="button"
          onClick={() => toggleVisited(shop.id)}
          className="w-full mt-s5 py-[15px] rounded-r3 bg-accent font-ui font-semibold text-[12px] uppercase text-accent-ink"
          style={{ letterSpacing: "0.14em" }}
        >
          {mark?.visited ? "Visited" : "Mark visited"}
        </button>

        <button
          type="button"
          onClick={() => setShowEditor((v) => !v)}
          className="w-full mt-[10px] py-[13px] rounded-r3 border border-line-3 font-ui font-medium text-[11px] uppercase text-ink-2"
          style={{ letterSpacing: "0.14em", borderWidth: "0.5px" }}
        >
          Add note or rating
        </button>

        {showEditor && (
          <NoteRatingEditor
            initialNote={mark?.note ?? ""}
            initialRating={mark?.rating ?? 0}
            onSave={(note, rating) => {
              setNoteRating(shop.id, note, rating);
              setShowEditor(false);
            }}
          />
        )}

        <div
          className="font-ui text-[10px] uppercase text-ink-3 mt-s4"
          style={{ letterSpacing: "0.04em" }}
        >
          Source · theworlds100bestcoffeeshops.com · list refreshes yearly · your marks are kept locally
        </div>
      </div>
    </main>
  );
}

function NoteRatingEditor({
  initialNote,
  initialRating,
  onSave,
}: {
  initialNote: string;
  initialRating: number;
  onSave: (note: string, rating: number) => void;
}) {
  const [note, setNote] = useState(initialNote);
  const [rating, setRating] = useState(initialRating);

  return (
    <div className="mt-s4 flex flex-col gap-s4">
      <div className="flex flex-col gap-s2">
        <OLabel text="Rating (0-10, 0 = unrated)" />
        <div className="flex items-center gap-[10px]">
          <button
            type="button"
            onClick={() => setRating((r) => Math.max(0, r - 1))}
            className="w-[32px] h-[32px] rounded-r2 bg-bg-2 text-ink-2"
            aria-label="Decrease rating"
          >
            -
          </button>
          <span className="font-mono text-[22px] text-accent w-[44px] text-center">
            {rating === 0 ? "—" : rating}
          </span>
          <button
            type="button"
            onClick={() => setRating((r) => Math.min(10, r + 1))}
            className="w-[32px] h-[32px] rounded-r2 bg-bg-2 text-ink-2"
            aria-label="Increase rating"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-s2">
        <OLabel text="Note" />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What was it like?"
          rows={4}
          className="bg-bg-2 rounded-r3 p-s3 font-ui text-[14px] text-ink-1 placeholder:text-ink-4 outline-none resize-none"
        />
      </div>

      <button
        type="button"
        onClick={() => onSave(note.trim(), rating)}
        className="py-[14px] rounded-r3 bg-accent font-ui font-semibold text-[12px] uppercase text-accent-ink"
        style={{ letterSpacing: "0.14em" }}
      >
        Save
      </button>
    </div>
  );
}
