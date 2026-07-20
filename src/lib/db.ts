import { promises as fs } from "fs";
import path from "path";
import type { Database } from "./types";

// -----------------------------------------------------------------------------
// Local JSON-backed store.
//
// This is intentionally the ONLY module that touches persistence. Every read /
// write in the app goes through the typed helpers below, so when we move to
// Supabase (Postgres) we replace this file's internals and nothing else changes.
//
// Data lives in web/.data/db.json (gitignored). Fine for a demo + first
// customers; not for production concurrency.
// -----------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "db.json");

const EMPTY_DB: Database = {
  teachers: [],
  sessionTypes: [],
  availability: [],
  bookings: [],
};

async function ensureFile(): Promise<void> {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(EMPTY_DB, null, 2), "utf8");
  }
}

export async function readDb(): Promise<Database> {
  await ensureFile();
  const raw = await fs.readFile(DB_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw) as Partial<Database>;
    // Merge over EMPTY_DB so a partial/older file never crashes a read.
    return { ...EMPTY_DB, ...parsed } as Database;
  } catch {
    return { ...EMPTY_DB };
  }
}

export async function writeDb(db: Database): Promise<void> {
  await ensureFile();
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

// Convenience: mutate the whole DB atomically-ish (read → update → write).
export async function updateDb(
  mutator: (db: Database) => void | Promise<void>,
): Promise<void> {
  const db = await readDb();
  await mutator(db);
  await writeDb(db);
}

// Simple id generator — good enough for a single-process demo store.
let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
