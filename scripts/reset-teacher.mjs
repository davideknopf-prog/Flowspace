// Wipe ONE teacher's business data to a clean slate — keeps the account and
// profile (name, bio, photo, slug, login) but removes all bookings, passes,
// payouts, reviews, scheduled times, classes, and offers. Use this to
// repurpose a demo bot into a real teacher's studio.
//
// Safe by design: requires an explicit slug AND --confirm.
//   node scripts/reset-teacher.mjs --slug=alex-tice --confirm
import { fileURLToPath } from "url";
import path from "path";
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });
const sql = neon(process.env.DATABASE_URL);

const args = process.argv.slice(2);
const slug = (args.find((a) => a.startsWith("--slug=")) || "").split("=")[1];
const confirmed = args.includes("--confirm");

if (!slug) {
  console.error("Usage: node scripts/reset-teacher.mjs --slug=<teacher-slug> --confirm");
  process.exit(1);
}

const rows = await sql`select id, name, slug from teachers where slug = ${slug}`;
const teacher = rows[0];
if (!teacher) {
  console.error(`No teacher with slug "${slug}".`);
  process.exit(1);
}

// Show what will be removed.
const counts = {};
for (const t of ["bookings", "passes", "payouts", "payout_requests", "class_events", "reviews", "offers", "session_types", "availability"]) {
  const [{ c }] = await sql.query(`select count(*)::int as c from ${t} where teacher_id = $1`, [teacher.id]);
  counts[t] = c;
}

console.log(`Teacher: ${teacher.name} (${teacher.slug})`);
console.log("Will delete:", Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", "));

if (!confirmed) {
  console.log("\nDry run — nothing deleted. Re-run with --confirm to wipe.");
  process.exit(0);
}

// FK-safe order: children before parents.
const tid = teacher.id;
await sql`delete from payout_requests where teacher_id = ${tid}`;
await sql`delete from payouts where teacher_id = ${tid}`;
await sql`delete from bookings where teacher_id = ${tid}`;
await sql`delete from passes where teacher_id = ${tid}`;
await sql`delete from class_events where teacher_id = ${tid}`;
await sql`delete from reviews where teacher_id = ${tid}`;
await sql`delete from offers where teacher_id = ${tid}`;
await sql`delete from session_types where teacher_id = ${tid}`;
await sql`delete from availability where teacher_id = ${tid}`;

console.log(`\n✅ ${teacher.name} reset to a clean slate. Profile & login kept.`);
console.log("Rebuild their classes and times in Dashboard → Schedule & pricing.");
