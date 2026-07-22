// One-off: convert availability-based teachers to the event model, idempotently.
// For each teacher: every active events-mode session type with NO scheduled
// events gets up to 2 weekly events, placed inside the teacher's existing
// availability windows, round-robin so classes don't stack on the same hour.
// Teachers then refine times in Dashboard → Schedule & pricing.
// Run: node scripts/convert-to-events.mjs
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

const newId = (p) =>
  `${p}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;

const teachers = await sql`select id, name from teachers`;

for (const t of teachers) {
  const [sessions, rules, existing] = await Promise.all([
    sql`select id, name, scheduling, active from session_types where teacher_id = ${t.id} and active = true`,
    sql`select weekday, start_minutes, end_minutes from availability where teacher_id = ${t.id} order by weekday, start_minutes`,
    sql`select session_type_id from class_events where teacher_id = ${t.id}`,
  ]);
  const hasEvents = new Set(existing.map((e) => e.session_type_id));
  const eventful = sessions.filter(
    (s) => s.scheduling !== "flexible" && !hasEvents.has(s.id),
  );
  if (eventful.length === 0) {
    console.log(`✓ ${t.name}: nothing to convert`);
    continue;
  }
  if (rules.length === 0) {
    console.log(`- ${t.name}: no availability to convert from — schedule manually`);
    continue;
  }

  // Candidate (weekday, startMinutes) hours inside availability windows.
  const hours = [];
  for (const r of rules) {
    for (let m = r.start_minutes; m + 60 <= r.end_minutes; m += 60) {
      hours.push({ weekday: r.weekday, startMinutes: m });
    }
  }

  // Round-robin classes across candidate hours; 2 weekly events per class.
  let cursor = 0;
  for (const s of eventful) {
    let created = 0;
    while (created < 2 && cursor < hours.length * 2) {
      const h = hours[cursor % hours.length];
      cursor++;
      await sql`
        insert into class_events (id, teacher_id, session_type_id, kind, weekday, start_minutes)
        values (${newId("evt")}, ${t.id}, ${s.id}, 'weekly', ${h.weekday}, ${h.startMinutes})
      `;
      created++;
    }
    console.log(`  ${t.name}: "${s.name}" → ${created} weekly time${created === 1 ? "" : "s"}`);
  }
}

console.log("\nDone. Teachers can refine times in Dashboard → Schedule & pricing.");
