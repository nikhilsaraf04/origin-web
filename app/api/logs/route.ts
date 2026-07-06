// Sync endpoints for coffee logs. Both clients speak the same snake_case row
// shape they used with Supabase, so this is a drop-in replacement.
//
//   GET  /api/logs?since=<iso>   -> { logs: Row[] }   rows updated after `since`
//   POST /api/logs   { logs: Row[] } -> { ok, count }  upsert (LWW by updated_at)
//
// Auth: bearer token (iOS) or origin_token cookie (web). All rows are scoped
// to the single user id derived from the token.

import { NextResponse } from "next/server";
import { authUserId } from "@/lib/auth";
import { getDb, serializeRow, deserializeRow, LOG_COLUMNS } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const uid = authUserId(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const since = searchParams.get("since") ?? "1970-01-01T00:00:00.000Z";

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM coffee_logs
        WHERE user_id = ? AND updated_at > ?
        ORDER BY updated_at ASC`,
    )
    .all(uid, since) as Record<string, unknown>[];

  return NextResponse.json({ logs: rows.map(deserializeRow) });
}

export async function POST(req: Request) {
  const uid = authUserId(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let logs: Record<string, unknown>[] = [];
  try {
    const body = await req.json();
    const arr = Array.isArray(body?.logs)
      ? body.logs
      : Array.isArray(body)
        ? body
        : null;
    if (!arr) throw new Error("bad shape");
    logs = arr as Record<string, unknown>[];
  } catch {
    return NextResponse.json(
      { error: "Body must be { logs: Row[] }" },
      { status: 400 },
    );
  }

  const db = getDb();
  const cols = LOG_COLUMNS as readonly string[];
  const placeholders = cols.map((c) => `@${c}`).join(", ");
  const updates = cols
    .filter((c) => c !== "id")
    // Last-write-wins: only overwrite when the incoming row is newer.
    .map((c) => `${c} = excluded.${c}`)
    .join(", ");

  const stmt = db.prepare(
    `INSERT INTO coffee_logs (${cols.join(", ")})
       VALUES (${placeholders})
     ON CONFLICT(id) DO UPDATE SET ${updates}
       WHERE excluded.updated_at >= coffee_logs.updated_at`,
  );

  const now = new Date().toISOString();
  let count = 0;
  const tx = db.transaction((incoming: Record<string, unknown>[]) => {
    for (const raw of incoming) {
      // Force server-side ownership + fill required timestamps defensively.
      const row = serializeRow({
        ...raw,
        user_id: uid,
        created_at: raw.created_at ?? now,
        updated_at: raw.updated_at ?? now,
      });
      // Bind only known columns; unknown keys are ignored.
      const bind: Record<string, unknown> = {};
      for (const c of cols) bind[c] = row[c] ?? null;
      stmt.run(bind);
      count++;
    }
  });

  try {
    tx(logs);
  } catch (err) {
    return NextResponse.json(
      { error: `Upsert failed: ${(err as Error).message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, count });
}
