// Sync endpoints for place visits — a cup had somewhere, as opposed to a bag
// brought home. Same contract as /api/logs so both share one sync strategy.
//
//   GET  /api/visits?since=<iso>     -> { visits: Row[] }  rows updated after `since`
//   POST /api/visits { visits: Row[] } -> { ok, count }    upsert (LWW by updated_at)
//
// Auth: bearer token (iOS) or origin_token cookie (web). All rows are scoped
// to the single user id derived from the token.

import { NextResponse } from "next/server";
import { authUserId } from "@/lib/auth";
import {
  getDb,
  serializePlaceRow,
  deserializePlaceRow,
  PLACE_COLUMNS,
} from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const uid = authUserId(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const since = searchParams.get("since") ?? "1970-01-01T00:00:00.000Z";

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM place_visits
        WHERE user_id = ? AND updated_at > ?
        ORDER BY updated_at ASC`,
    )
    .all(uid, since) as Record<string, unknown>[];

  return NextResponse.json({ visits: rows.map(deserializePlaceRow) });
}

export async function POST(req: Request) {
  const uid = authUserId(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let visits: Record<string, unknown>[] = [];
  try {
    const body = await req.json();
    const arr = Array.isArray(body?.visits)
      ? body.visits
      : Array.isArray(body)
        ? body
        : null;
    if (!arr) throw new Error("bad shape");
    visits = arr as Record<string, unknown>[];
  } catch {
    return NextResponse.json(
      { error: "Body must be { visits: Row[] }" },
      { status: 400 },
    );
  }

  const db = getDb();
  const cols = PLACE_COLUMNS as readonly string[];
  const placeholders = cols.map((c) => `@${c}`).join(", ");
  const updates = cols
    .filter((c) => c !== "id")
    .map((c) => `${c} = excluded.${c}`)
    .join(", ");

  const stmt = db.prepare(
    `INSERT INTO place_visits (${cols.join(", ")})
       VALUES (${placeholders})
     ON CONFLICT(id) DO UPDATE SET ${updates}
       WHERE excluded.updated_at >= place_visits.updated_at`,
  );

  const now = new Date().toISOString();
  let count = 0;
  const tx = db.transaction((incoming: Record<string, unknown>[]) => {
    for (const raw of incoming) {
      const row = serializePlaceRow({
        ...raw,
        user_id: uid,
        created_at: raw.created_at ?? now,
        updated_at: raw.updated_at ?? now,
        date_visited: raw.date_visited ?? now,
      });
      const bind: Record<string, unknown> = {};
      for (const c of cols) bind[c] = row[c] ?? null;
      stmt.run(bind);
      count++;
    }
  });

  try {
    tx(visits);
  } catch (err) {
    return NextResponse.json(
      { error: `Upsert failed: ${(err as Error).message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, count });
}
