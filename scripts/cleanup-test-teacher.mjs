// Fully remove a test teacher account (the +teachertest signup) and everything
// attached to it, so the mission-control roster stays pristine.
//
// Safe by default: dry-run unless you pass --confirm. Targets by email so you
// don't need the slug. Deletes bookings + passes first (they have non-cascading
// FKs to session_types/offers), then deletes the teacher — which cascades away
// session_types, offers, availability, reviews, payouts, payout_requests,
// quotes, and class_events automatically.
//
//   node scripts/cleanup-test-teacher.mjs                 # dry run, matches %teachertest%
//   node scripts/cleanup-test-teacher.mjs --confirm       # actually delete
//   node scripts/cleanup-test-teacher.mjs --email=foo@bar.com --confirm
import { fileURLToPath } from "url";
import path from "path";
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });
const sql = neon(process.env.DATABASE_URL);

const confirm = process.argv.includes("--confirm");
const emailArg = process.argv.find((a) => a.startsWith("--email="));
const pattern = emailArg ? emailArg.split("=")[1] : "%teachertest%";

const teachers = await sql`
  select id, name, slug, email, is_demo
  from teachers
  where email ilike ${pattern}
`;

if (teachers.length === 0) {
  console.log(`No teachers match email pattern "${pattern}". Nothing to do.`);
  process.exit(0);
}

for (const t of teachers) {
  const [{ count: sessions }] = await sql`select count(*)::int as count from session_types where teacher_id = ${t.id}`;
  const [{ count: bookings }] = await sql`select count(*)::int as count from bookings where teacher_id = ${t.id}`;
  const [{ count: offers }] = await sql`select count(*)::int as count from offers where teacher_id = ${t.id}`;
  const [{ count: passes }] = await sql`select count(*)::int as count from passes where teacher_id = ${t.id}`;
  console.log(
    `${confirm ? "DELETING" : "would delete"}: ${t.name} <${t.email}> (/t/${t.slug})` +
      `${t.is_demo ? " [DEMO]" : ""} — ${sessions} classes, ${bookings} bookings, ${offers} offers, ${passes} passes`,
  );
}

// Guardrail: never let this touch a demo profile by accident.
if (teachers.some((t) => t.is_demo)) {
  console.error("\n✗ One or more matches is a DEMO teacher — refusing to delete. Narrow the --email.");
  process.exit(1);
}

if (!confirm) {
  console.log(`\nDry run only. Re-run with --confirm to delete the above.`);
  process.exit(0);
}

for (const t of teachers) {
  await sql`delete from bookings where teacher_id = ${t.id}`;
  await sql`delete from passes where teacher_id = ${t.id}`;
  await sql`delete from teachers where id = ${t.id}`;
  console.log(`✓ removed ${t.name} (${t.slug})`);
}
console.log("\nDone. Your roster is clean.");
