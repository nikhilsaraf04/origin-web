// Add or edit a visit: a cup had at a roastery or café, without a bag.
//
// Deliberately short. The bag flow earns its length because a scan fills most
// of it in; a visit is typed by hand, usually on a phone, often standing up.
// Everything past the name, place and rating is optional.

"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { OLabel } from "@/components/OLabel";
import { OChip } from "@/components/OChip";
import { usePlaceStore } from "@/lib/store/place-store";
import {
  emptyPlaceVisit,
  PlaceKindAll,
  visitPhotos,
  type PlaceKind,
  type PlaceVisit,
} from "@/lib/types/place";
import {
  fileToDownscaledDataUrl,
  uploadVisitPhoto,
} from "@/lib/services/visit-image";
import { FlavorGroups } from "@/lib/flavor-taxonomy";
import { ROASTERS } from "@/lib/data/roasters";

function isoDateInput(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? new Date().toISOString().slice(0, 10)
    : d.toISOString().slice(0, 10);
}

export function PlaceFormScreen({ visitId }: { visitId?: string }) {
  const router = useRouter();
  const getVisit = usePlaceStore((s) => s.getVisit);
  const save = usePlaceStore((s) => s.save);
  const update = usePlaceStore((s) => s.update);
  const remove = usePlaceStore((s) => s.remove);

  const existing = visitId ? getVisit(visitId) : undefined;
  const [draft, setDraft] = useState<PlaceVisit>(
    () => existing ?? emptyPlaceVisit(),
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Photos of the visit, in display order. `url` = already stored on the
  // server; `dataUrl` = freshly picked, uploaded on save.
  const [photos, setPhotos] = useState<{ url?: string; dataUrl?: string }[]>(
    () => visitPhotos(existing ?? emptyPlaceVisit()).map((url) => ({ url })),
  );
  const fileInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof PlaceVisit>(key: K, value: PlaceVisit[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  // Multi-select kind chips. The first selected kind stays the primary
  // (`kind`), and the last remaining chip cannot be turned off.
  const toggleKind = (k: PlaceKind) =>
    setDraft((d) => {
      const has = d.kinds.includes(k);
      if (has && d.kinds.length === 1) return d;
      const kinds = has ? d.kinds.filter((x) => x !== k) : [...d.kinds, k];
      return { ...d, kinds, kind: kinds[0] };
    });

  // Suggest directory roasters as you type the name, so a visit can link to a
  // known roaster and mark it tasted.
  const suggestions = useMemo(() => {
    const q = draft.name.trim().toLowerCase();
    if (q.length < 2) return [];
    return ROASTERS.filter((r) => r.name.toLowerCase().includes(q)).slice(0, 4);
  }, [draft.name]);

  const canSave = draft.name.trim().length > 0 && draft.city.trim().length > 0;

  const onPickPhotos = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        const dataUrl = await fileToDownscaledDataUrl(file);
        setPhotos((p) => [...p, { dataUrl }]);
      } catch {
        /* not an image / unreadable — skip */
      }
    }
  };

  const onSave = async () => {
    if (!canSave) return;
    // Upload freshly picked photos at their final display positions. A failed
    // upload keeps its local data URL as a preview (as bag photos do) instead
    // of blocking the save.
    const urls: string[] = [];
    const localOnly: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      if (p.url) {
        urls.push(p.url);
      } else if (p.dataUrl) {
        try {
          urls.push(await uploadVisitPhoto(draft.id, i, p.dataUrl));
        } catch {
          localOnly.push(p.dataUrl);
        }
      }
    }
    const clean: PlaceVisit = {
      ...draft,
      name: draft.name.trim(),
      city: draft.city.trim(),
      country: draft.country.trim(),
      drink: draft.drink.trim(),
      notes: draft.notes.trim(),
      photoUrl: urls[0],
      photoUrls: urls,
      photoDataUrl: undefined,
      photoDataUrls: localOnly.length > 0 ? localOnly : undefined,
    };
    if (existing) update(existing.id, clean);
    else save(clean);
    router.push("/places");
  };

  const onDelete = () => {
    if (!existing) return;
    remove(existing.id);
    router.push("/places");
  };

  return (
    <main className="min-h-screen pb-[140px]">
      <header className="pt-[60px] pb-s4 px-s5 max-w-2xl mx-auto">
        <h1 className="font-display text-[32px] text-ink-1 leading-none">
          {existing ? "Edit visit" : "New visit"}
        </h1>
        <span
          className="font-ui text-[10px] uppercase text-ink-3"
          style={{ letterSpacing: "0.1em" }}
        >
          A cup you had, not a bag you bought
        </span>
      </header>

      <div className="max-w-2xl mx-auto px-s5 flex flex-col gap-s5">
        <Field label="Place">
          <input
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Kaffa Roastery"
            className="o-input"
            autoFocus={!existing}
          />
          {suggestions.length > 0 && draft.roasterName !== draft.name && (
            <div className="flex flex-wrap gap-s2 mt-s2">
              {suggestions.map((r) => (
                <button
                  key={r.name}
                  type="button"
                  onClick={() => {
                    setDraft((d) => ({
                      ...d,
                      name: r.name,
                      roasterName: r.name,
                      city: d.city || r.city,
                      country: d.country || r.country,
                    }));
                  }}
                  className="font-ui text-[11px] px-s3 py-[5px] rounded-r2 border text-ink-2"
                  style={{ borderWidth: "0.5px", borderColor: "var(--line-2)" }}
                >
                  {r.name}
                  <span className="text-ink-4"> · {r.city}</span>
                </button>
              ))}
            </div>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-s4">
          <Field label="City">
            <input
              value={draft.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="Helsinki"
              className="o-input"
            />
          </Field>
          <Field label="Country">
            <input
              value={draft.country}
              onChange={(e) => set("country", e.target.value)}
              placeholder="Finland"
              className="o-input"
            />
          </Field>
        </div>

        <Field label="Kind · pick all that apply">
          <div className="flex flex-wrap gap-s2">
            {PlaceKindAll.map((k) => (
              <Toggle
                key={k}
                label={k}
                active={draft.kinds.includes(k)}
                onClick={() => toggleKind(k as PlaceKind)}
              />
            ))}
          </div>
        </Field>

        <Field label="Photos">
          <div className="flex flex-wrap gap-s2">
            {photos.map((p, i) => (
              <div
                key={p.url ?? i}
                className="relative w-[84px] h-[84px] rounded-r2 overflow-hidden border"
                style={{ borderWidth: "0.5px", borderColor: "var(--line-2)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url ?? p.dataUrl}
                  alt={`Photo ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => setPhotos((all) => all.filter((_, j) => j !== i))}
                  className="absolute top-[4px] right-[4px] w-[18px] h-[18px] rounded-full font-ui text-[10px] flex items-center justify-center"
                  style={{ background: "rgba(10, 15, 24, 0.75)", color: "var(--ink-2)" }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="w-[84px] h-[84px] rounded-r2 border border-dashed flex flex-col items-center justify-center gap-[4px] font-ui text-[10px] uppercase text-ink-3"
              style={{ borderColor: "var(--ink-4)", letterSpacing: "0.1em" }}
            >
              <span className="text-[18px]">+</span>
              Add photo
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void onPickPhotos(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-s4">
          <Field label="When">
            <input
              type="date"
              value={isoDateInput(draft.dateVisited)}
              onChange={(e) => {
                const v = e.target.value;
                const iso = v
                  ? new Date(`${v}T12:00:00Z`).toISOString()
                  : new Date().toISOString();
                set("dateVisited", iso);
              }}
              className="o-input"
            />
          </Field>
          <Field label="Bean origin (optional)">
            <input
              value={draft.originCountry ?? ""}
              onChange={(e) => set("originCountry", e.target.value)}
              placeholder="Ethiopia"
              className="o-input"
            />
          </Field>
        </div>

        <Field label="What you drank">
          <input
            value={draft.drink}
            onChange={(e) => set("drink", e.target.value)}
            placeholder="V60, Ethiopia natural"
            className="o-input"
          />
        </Field>

        <Field label={`Rating · ${draft.rating}`}>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={draft.rating}
            onChange={(e) => set("rating", Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
          />
        </Field>

        <Field label="Flavours (optional)">
          <FlavorPicker
            selected={draft.flavorTags}
            onToggle={(tag) =>
              set(
                "flavorTags",
                draft.flavorTags.includes(tag)
                  ? draft.flavorTags.filter((t) => t !== tag)
                  : [...draft.flavorTags, tag],
              )
            }
          />
        </Field>

        <Field label="Notes">
          <textarea
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            placeholder="Bright, clean, best cortado of the trip."
            className="o-input resize-none"
          />
        </Field>

        <label className="flex items-center gap-s3 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.wouldReturn}
            onChange={(e) => set("wouldReturn", e.target.checked)}
            className="accent-[var(--accent)] w-[16px] h-[16px]"
          />
          <span className="font-ui text-[13px] text-ink-2">Would go back</span>
        </label>

        <div className="flex items-center gap-s3 pt-s2">
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={!canSave}
            className="flex-1 font-ui text-[13px] font-medium py-s4 rounded-r4 transition-colors"
            style={{
              background: canSave ? "var(--accent)" : "var(--bg-1)",
              color: canSave ? "var(--accent-ink)" : "var(--ink-4)",
              cursor: canSave ? "pointer" : "not-allowed",
            }}
          >
            {existing ? "Save changes" : "Save visit"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="font-ui text-[13px] text-ink-3 px-s4 py-s4"
          >
            Cancel
          </button>
        </div>

        {!canSave && (
          <p className="font-ui text-[11px] text-ink-4">
            A place and a city are the minimum. Everything else is optional.
          </p>
        )}

        {existing && (
          <div className="pt-s5 border-t border-line-1 mt-s2">
            {confirmDelete ? (
              <div className="flex items-center gap-s3">
                <button
                  type="button"
                  onClick={onDelete}
                  className="font-ui text-[12px] px-s4 py-s3 rounded-r2 border"
                  style={{
                    borderWidth: "0.5px",
                    borderColor: "var(--line-2)",
                    color: "#E2685F",
                  }}
                >
                  Delete this visit
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="font-ui text-[12px] text-ink-3"
                >
                  Keep it
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="font-ui text-[12px] text-ink-4"
              >
                Delete visit
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-s2">
      <OLabel text={label} />
      {children}
    </div>
  );
}

function Toggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-ui text-[12px] px-s3 py-[6px] rounded-r2 border transition-colors"
      style={{
        borderWidth: "0.5px",
        borderColor: active ? "var(--accent-border)" : "var(--line-2)",
        background: active ? "var(--accent-dim)" : "transparent",
        color: active ? "var(--accent)" : "var(--ink-3)",
      }}
    >
      {label}
    </button>
  );
}

/** Collapsed by default: 72 tags is a wall on a phone. */
function FlavorPicker({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-s2">
        {selected.map((t) => (
          <OChip key={t} text={t.replace(/-/g, " ")} />
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-ui text-[12px] text-accent"
        >
          {selected.length ? "Edit" : "Add flavours"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-s3">
      {FlavorGroups.map((g) => (
        <div key={g.label} className="flex flex-col gap-s2">
          <span className="font-ui text-[10px] uppercase text-ink-4" style={{ letterSpacing: "0.1em" }}>
            {g.label}
          </span>
          <div className="flex flex-wrap gap-s2">
            {g.tags.map((t) => {
              const active = selected.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onToggle(t)}
                  className="font-ui text-[11px] px-s3 py-[5px] rounded-r2 border transition-colors"
                  style={{
                    borderWidth: "0.5px",
                    borderColor: active ? "var(--accent-border)" : "var(--line-2)",
                    background: active ? "var(--accent-dim)" : "transparent",
                    color: active ? "var(--accent)" : "var(--ink-3)",
                  }}
                >
                  {t.replace(/-/g, " ")}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="font-ui text-[12px] text-accent self-start"
      >
        Done
      </button>
    </div>
  );
}
