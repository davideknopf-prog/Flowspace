// Seed realistic demo teacher profiles so the platform looks alive for
// rollout demos. Idempotent: skips any demo teacher whose slug already
// exists. Demo teachers have no Clerk account (no one can log in as them)
// and no subscription — their PUBLIC pages work regardless, which is all a
// demo needs. Run: node scripts/seed-demo-teachers.mjs
// Remove them any time: node scripts/seed-demo-teachers.mjs --remove
import { fileURLToPath } from "url";
import path from "path";
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });
const sql = neon(process.env.DATABASE_URL);

const DEMO_TEACHERS = [
  {
    slug: "maya-chen",
    email: "demo-maya@flowspace.demo",
    name: "Maya Chen",
    headline: "Vinyasa & breathwork for busy professionals",
    bio: "I've spent a decade helping desk-bound professionals undo the damage of the 9-to-5. My classes blend strong, mindful vinyasa with breathwork you can actually use — in traffic, before a big meeting, anywhere. Expect to sweat a little, breathe a lot, and leave lighter than you came.\n\n500-hr RYT · Trained in Mysore, India",
    location: "Austin, TX · and Online",
    specialties: ["Vinyasa", "Breathwork", "Corporate wellness"],
    timezone: "America/Chicago",
    sessions: [
      { name: "Vinyasa 1:1", description: "A private flow tailored to your level", durationMinutes: 60, priceCents: 8500, locationType: "online", meetingUrl: "", locationNote: "" },
      { name: "Lunchbreak Flow (Group)", description: "45 minutes to reset your workday", durationMinutes: 45, priceCents: 1800, locationType: "online", meetingUrl: "", locationNote: "" },
    ],
    offers: [
      { name: "5-Class Pass", description: "Five classes, use within 3 months", priceCents: 8000, creditCount: 5, validDays: 90 },
      { name: "Unlimited Monthly", description: "Unlimited classes for 30 days", priceCents: 11000, creditCount: null, validDays: 30 },
    ],
    availability: [
      { weekday: 1, startMinutes: 7 * 60, endMinutes: 11 * 60 },
      { weekday: 3, startMinutes: 7 * 60, endMinutes: 11 * 60 },
      { weekday: 5, startMinutes: 12 * 60, endMinutes: 17 * 60 },
    ],
  },
  {
    slug: "james-okafor",
    email: "demo-james@flowspace.demo",
    name: "James Okafor",
    headline: "Strength-focused yoga for athletes & lifters",
    bio: "Former college sprinter turned yoga teacher. I work with athletes, runners, and gym rats who think they're 'too tight for yoga' — that's exactly why you need it. Mobility, recovery, and injury prevention, without the incense.\n\nRYT-200 · FRC Mobility Specialist",
    location: "Boston, MA",
    specialties: ["Athletic mobility", "Power yoga", "Recovery"],
    timezone: "America/New_York",
    sessions: [
      { name: "Athlete Mobility 1:1", description: "Personalized mobility work for your sport", durationMinutes: 60, priceCents: 9000, locationType: "online", meetingUrl: "", locationNote: "" },
      { name: "Team Session (In-Person)", description: "Bring your team, leave recovered", durationMinutes: 90, priceCents: 4000, locationType: "in_person", meetingUrl: "", locationNote: "Flexible — your gym or field" },
    ],
    offers: [
      { name: "10-Class Pass", description: "Ten sessions, use within 6 months", priceCents: 76500, creditCount: 10, validDays: 180 },
    ],
    availability: [
      { weekday: 2, startMinutes: 6 * 60, endMinutes: 10 * 60 },
      { weekday: 4, startMinutes: 6 * 60, endMinutes: 10 * 60 },
      { weekday: 6, startMinutes: 8 * 60, endMinutes: 12 * 60 },
    ],
  },
  {
    slug: "sofia-reyes",
    email: "demo-sofia@flowspace.demo",
    name: "Sofia Reyes",
    headline: "Gentle & restorative yoga — all bodies welcome",
    bio: "Yoga found me after burnout, and I teach the way I wish someone had taught me then: slow, kind, and zero judgment. My classes are for real bodies — new moms, seniors, beginners, and anyone tired of feeling like yoga isn't 'for them.' It is.\n\nRYT-500 · Prenatal & Restorative certified",
    location: "Online only",
    specialties: ["Restorative", "Prenatal", "Beginners", "Yin"],
    timezone: "America/Los_Angeles",
    sessions: [
      { name: "Restorative 1:1", description: "An hour that feels like a vacation", durationMinutes: 60, priceCents: 7000, locationType: "online", meetingUrl: "", locationNote: "" },
      { name: "Gentle Evening Flow (Group)", description: "Wind down together", durationMinutes: 60, priceCents: 1500, locationType: "online", meetingUrl: "", locationNote: "" },
    ],
    offers: [
      { name: "5-Class Pass", description: "Five gentle classes, no rush — 6 months to use", priceCents: 6500, creditCount: 5, validDays: 180 },
    ],
    availability: [
      { weekday: 1, startMinutes: 17 * 60, endMinutes: 20 * 60 },
      { weekday: 2, startMinutes: 17 * 60, endMinutes: 20 * 60 },
      { weekday: 4, startMinutes: 17 * 60, endMinutes: 20 * 60 },
      { weekday: 0, startMinutes: 9 * 60, endMinutes: 12 * 60 },
    ],
  },
];

const removeMode = process.argv.includes("--remove");
let n = 0;
const id = (p) => `${p}_${Date.now().toString(36)}${(n++).toString(36)}`;

if (removeMode) {
  for (const t of DEMO_TEACHERS) {
    await sql.query("delete from teachers where slug = $1 and email like '%@flowspace.demo'", [t.slug]);
    console.log(`- removed ${t.slug}`);
  }
  process.exit(0);
}

for (const t of DEMO_TEACHERS) {
  const existing = await sql.query("select 1 from teachers where slug = $1", [t.slug]);
  if (existing.length > 0) {
    console.log(`✓ ${t.slug} already exists — skipping`);
    continue;
  }
  const teacherId = id("tch");
  await sql.query(
    `insert into teachers (id, slug, email, name, headline, bio, location, specialties, avatar_url, timezone)
     values ($1, $2, $3, $4, $5, $6, $7, $8, '', $9)`,
    [teacherId, t.slug, t.email, t.name, t.headline, t.bio, t.location, JSON.stringify(t.specialties), t.timezone],
  );
  for (const s of t.sessions) {
    await sql.query(
      `insert into session_types (id, teacher_id, name, description, duration_minutes, price_cents, active, location_type, meeting_url, location_note)
       values ($1, $2, $3, $4, $5, $6, true, $7, $8, $9)`,
      [id("ses"), teacherId, s.name, s.description, s.durationMinutes, s.priceCents, s.locationType, s.meetingUrl, s.locationNote],
    );
  }
  for (const o of t.offers) {
    await sql.query(
      `insert into offers (id, teacher_id, name, description, price_cents, credit_count, valid_days, active)
       values ($1, $2, $3, $4, $5, $6, $7, true)`,
      [id("off"), teacherId, o.name, o.description, o.priceCents, o.creditCount, o.validDays],
    );
  }
  for (const a of t.availability) {
    await sql.query(
      `insert into availability (id, teacher_id, weekday, start_minutes, end_minutes) values ($1, $2, $3, $4, $5)`,
      [id("avl"), teacherId, a.weekday, a.startMinutes, a.endMinutes],
    );
  }
  console.log(`+ seeded ${t.name} → /t/${t.slug}`);
}
console.log("\nDone.");
