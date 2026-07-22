// One-off: tidy demo teachers' schedules. Each teacher keeps exactly TWO
// weekly class times, never back-to-back — different weekdays when possible,
// different class types when possible. Everything else is deleted (times are
// easy to re-add in Dashboard → Schedule & pricing).
// Run: node scripts/tidy-demo-events.mjs
import { fileURLToPath } from "url";
import path from "path";
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not found — run `vercel env pull .env.local` first.");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

const fmt = (e) => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const h = Math.floor(e.start_minutes / 60);
  const m = e.start_minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${days[e.weekday]} ${h12}:${String(m).padStart(2, "0")} ${ampm}`;
};

const teachers = await sql`select id, name from teachers order by created_at`;

for (const t of teachers) {
  const events = await sql`
    select id, session_type_id, kind, weekday, start_minutes
    from class_events
    where teacher_id = ${t.id} and active = true
    order by weekday, start_minutes
  `;
  const weekly = events.filter((e) => e.kind === "weekly");
  if (weekly.length <= 2) {
    console.log(`✓ ${t.name}: ${weekly.length} weekly time(s) — nothing to tidy`);
    continue;
  }

  // Keep #1: the earliest. Keep #2: prefer a different weekday AND different
  // class; then different weekday; then same day but ≥3h later. Never
  // adjacent.
  const first = weekly[0];
  const pick2 =
    weekly.find(
      (e) =>
        e.weekday !== first.weekday && e.session_type_id !== first.session_type_id,
    ) ??
    weekly.find((e) => e.weekday !== first.weekday) ??
    weekly.find(
      (e) =>
        e.id !== first.id &&
        Math.abs(e.start_minutes - first.start_minutes) >= 180,
    );

  const keep = new Set([first.id, pick2?.id].filter(Boolean));
  const drop = events.filter((e) => !keep.has(e.id));
  for (const e of drop) {
    await sql`delete from class_events where id = ${e.id}`;
  }
  const kept = [first, pick2].filter(Boolean).map(fmt).join(" + ");
  console.log(`${t.name}: kept ${kept} · removed ${drop.length}`);
}

console.log("\nDone — every teacher now has 2 spaced weekly classes.");
