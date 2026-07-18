// SQLite backend for Origin. Single-file DB on a Fly volume (mounted at
// /data in production). Replaces Supabase Postgres — Origin is single-user
// with tiny data, so a file is simpler and cheaper than a Postgres app.
//
// The `coffee_logs` table mirrors the Supabase schema both clients already
// speak (snake_case columns). Array columns are stored as JSON text and
// (de)serialized at the API boundary.

import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

// In production the Fly volume is mounted at /data. Locally, fall back to a
// gitignored file in the repo root so `next dev` works without a volume.
const DB_PATH = process.env.ORIGIN_DB_PATH ?? "/data/origin.db";

// Bag photos live as files next to the DB on the same persistent volume, so
// the logs table stays small and images survive deploys/restarts.
export const IMAGES_DIR = join(dirname(DB_PATH), "images");

/** Ensure the images directory exists; returns its path. */
export function ensureImagesDir(): string {
  if (!existsSync(IMAGES_DIR)) mkdirSync(IMAGES_DIR, { recursive: true });
  return IMAGES_DIR;
}

let cached: Database.Database | null = null;

export function getDb(): Database.Database {
  if (cached) return cached;

  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  init(db);
  cached = db;
  return db;
}

function init(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS coffee_logs (
      id                  TEXT PRIMARY KEY,
      user_id             TEXT NOT NULL,
      created_at          TEXT NOT NULL,
      updated_at          TEXT NOT NULL,
      deleted_at          TEXT,

      roaster             TEXT NOT NULL DEFAULT '',
      coffee_name         TEXT NOT NULL DEFAULT '',
      origin_country      TEXT NOT NULL DEFAULT '',
      origin_region       TEXT,
      farm_estate         TEXT,
      variety             TEXT,
      altitude_masl       INTEGER,

      process             TEXT NOT NULL DEFAULT '',
      roast_level         TEXT NOT NULL DEFAULT '',
      brew_method         TEXT NOT NULL DEFAULT '',

      roast_date          TEXT,
      roaster_flavor_tags TEXT NOT NULL DEFAULT '[]',
      certifications      TEXT NOT NULL DEFAULT '[]',
      user_flavor_tags    TEXT NOT NULL DEFAULT '[]',

      rating              INTEGER NOT NULL DEFAULT 0,
      would_source_again  INTEGER NOT NULL DEFAULT 0,
      user_tasting_notes  TEXT NOT NULL DEFAULT '',
      body                TEXT,
      acidity             TEXT,

      date_consumed       TEXT NOT NULL,
      sourced_from        TEXT,
      currency            TEXT,
      bag_photo_url       TEXT,
      price_paid          REAL,

      match_score         INTEGER,
      match_reason        TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_coffee_logs_user_updated
      ON coffee_logs (user_id, updated_at);
  `);
}

// ---- Row (de)serialization -------------------------------------------------
// The DB stores arrays as JSON text and booleans as 0/1. The API speaks the
// same JSON shape both clients already use, so we marshal at this boundary.

const ARRAY_COLS = [
  "roaster_flavor_tags",
  "certifications",
  "user_flavor_tags",
] as const;

const BOOL_COLS = ["would_source_again"] as const;

/** DB row (arrays as JSON text, bools as 0/1) -> API row (arrays, bools). */
export function deserializeRow(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...raw };
  for (const c of ARRAY_COLS) {
    try {
      out[c] = raw[c] ? JSON.parse(raw[c] as string) : [];
    } catch {
      out[c] = [];
    }
  }
  for (const c of BOOL_COLS) {
    out[c] = !!raw[c];
  }
  return out;
}

/** API row -> DB bind object (arrays -> JSON text, bools -> 0/1). */
export function serializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const c of ARRAY_COLS) {
    out[c] = JSON.stringify(Array.isArray(row[c]) ? row[c] : []);
  }
  for (const c of BOOL_COLS) {
    out[c] = row[c] ? 1 : 0;
  }
  return out;
}

export const LOG_COLUMNS = [
  "id",
  "user_id",
  "created_at",
  "updated_at",
  "deleted_at",
  "roaster",
  "coffee_name",
  "origin_country",
  "origin_region",
  "farm_estate",
  "variety",
  "altitude_masl",
  "process",
  "roast_level",
  "brew_method",
  "roast_date",
  "roaster_flavor_tags",
  "certifications",
  "user_flavor_tags",
  "rating",
  "would_source_again",
  "user_tasting_notes",
  "body",
  "acidity",
  "date_consumed",
  "sourced_from",
  "currency",
  "bag_photo_url",
  "price_paid",
  "match_score",
  "match_reason",
] as const;
