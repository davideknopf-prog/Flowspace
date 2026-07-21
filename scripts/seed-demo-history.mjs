// Seed a realistic PAST business history for the demo teachers so the
// founder can show prospects a working studio: paid bookings, passes sold,
// earnings, and a payout. Idempotent-ish: refuses to run if demo history
// already exists. Remove with --remove.
// Run: node scripts/seed-demo-history.mjs
import { fileURLToPath } from "url";
import path from "path";
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });
const sql = neon(process.env.DATABASE_URL);

let n = 0;
const id = (p) => `${p}_demo${Date.now().toString(36)}${(n++).toString(36)}`;

// Realistic-but-fake students. example.com is reserved for exactly this.
const STUDENTS = [
  ["Sarah Mitchell", "sarah.mitchell@example.com"],
  ["Jenna Park", "jenna.park@example.com"],
  ["Tom Alvarez", "tom.alvarez@example.com"],
  ["Priya Nair", "priya.nair@example.com"],
  ["Rachel Kim", "rachel.kim@example.com"],
  ["Mike O'Donnell", "mike.odonnell@example.com"],
  ["Lena Fischer", "lena.fischer@example.com"],
  ["Dana Brooks", "dana.brooks@example.com"],
  ["Chris Tan", "chris.tan@example.com"],
  ["Amara Diallo", "amara.diallo@example.com"],
  ["Beth Nguyen", "beth.nguyen@example.com"],
  ["Jordan Wells", "jordan.wells@example.com"],
];

const removeMode = process.argv.includes("--remove");

if (removeMode) {
  await sql.query("delete from bookings where id like 'bkg_demo%'");
  await sql.query("delete from passes where id like 'pas_demo%'");
  await sql.query("delete from payouts where id like 'pay_demo%'");
  console.log("Removed all demo history.");
  process.exit(0);
}

const existing = await sql.query("select 1 from bookings where id like 'bkg_demo%' limit 1");
if (existing.length > 0) {
  console.log("Demo history already seeded — run with --remove first to reseed.");
  process.exit(0);
}

const stripeFee = (cents) => Math.round(cents * 0.029) + 30;

async function seedTeacher(slug, weeks, perWeek) {
  const teachers = await sql.query("select id, name from teachers where slug = $1", [slug]);
  const teacher = teachers[0];
  if (!teacher) return console.log(`! ${slug} not found — skipping`);

  const sessions = await sql.query(
    "select id, name, duration_minutes, price_cents, location_type, meeting_url, location_note from session_types where teacher_id = $1",
    [teacher.id],
  );
  const offers = await sql.query(
    "select id, name, price_cents, credit_count, valid_days from offers where teacher_id = $1",
    [teacher.id],
  );

  let gross = 0;
  let count = 0;

  // Past paid bookings spread over the last `weeks` weeks.
  for (let w = weeks; w >= 1; w--) {
    for (let k = 0; k < perWeek; k++) {
      const s = sessions[(w + k) % sessions.length];
      const student = STUDENTS[(w * 3 + k) % STUDENTS.length];
      const daysAgo = w * 7 - (k % 6);
      const hour = 7 + ((k * 3) % 11);
      const start = new Date();
      start.setDate(start.getDate() - daysAgo);
      start.setHours(hour, 0, 0, 0);

      await sql.query(
        `insert into bookings
           (id, teacher_id, session_type_id, client_name, client_email, note, start_iso,
            duration_minutes, price_cents, location_type, meeting_url, location_note,
            payment_status, status, platform_fee_cents, stripe_fee_cents)
         values ($1,$2,$3,$4,$5,'',$6,$7,$8,$9,$10,$11,'paid','confirmed',0,$12)`,
        [
          id("bkg"), teacher.id, s.id, student[0], student[1], start.toISOString(),
          s.duration_minutes, s.price_cents, s.location_type, s.meeting_url, s.location_note,
          stripeFee(s.price_cents),
        ],
      );
      gross += s.price_cents;
      count++;
    }
  }

  // A few passes sold (some partially used).
  for (let i = 0; i < Math.min(3, offers.length * 2); i++) {
    const o = offers[i % offers.length];
    const student = STUDENTS[(i * 5 + 1) % STUDENTS.length];
    const created = new Date();
    created.setDate(created.getDate() - (21 - i * 6));
    const expires = o.valid_days
      ? new Date(created.getTime() + o.valid_days * 86400_000).toISOString()
      : null;
    const used = o.credit_count ? Math.min(o.credit_count - 1, 1 + i) : 0;
    await sql.query(
      `insert into passes
         (id, offer_id, teacher_id, client_name, client_email, credits_total, credits_used,
          price_cents, platform_fee_cents, stripe_fee_cents, payment_status, expires_at, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,0,$9,'paid',$10,$11)`,
      [
        id("pas"), o.id, teacher.id, student[0], student[1], o.credit_count, used,
        o.price_cents, stripeFee(o.price_cents), expires, created.toISOString(),
      ],
    );
    gross += o.price_cents;
  }

  // One payout on record so the payout history isn't empty.
  const paidOut = Math.round(gross * 0.4);
  await sql.query(
    `insert into payouts (id, teacher_id, amount_cents, note, created_at)
     values ($1,$2,$3,'Bi-weekly payout',$4)`,
    [id("pay"), teacher.id, paidOut, new Date(Date.now() - 12 * 86400_000).toISOString()],
  );

  console.log(
    `+ ${teacher.name}: ${count} paid bookings + passes → $${(gross / 100).toFixed(0)} gross, $${(paidOut / 100).toFixed(0)} already paid out`,
  );
}

// Maya is the showcase (busiest); the others get lighter histories.
await seedTeacher("maya-chen", 6, 9);
await seedTeacher("james-okafor", 6, 5);
await seedTeacher("sofia-reyes", 6, 6);

console.log("\nDone. Remove any time: node scripts/seed-demo-history.mjs --remove");
