// Seed sample reviews on the demo teacher profiles so the reviews feature is
// visible in the live demo. These are illustrative testimonials on seeded demo
// personas — not real students. Idempotent: clears each demo teacher's existing
// reviews first, then inserts the curated set.
//
//   node scripts/seed-demo-reviews.mjs           # seed
//   node scripts/seed-demo-reviews.mjs --remove  # remove demo reviews
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
const remove = process.argv.includes("--remove");

const REVIEWS = {
  "maya-chen": [
    ["Priya S.", 5, true, "Maya's breathwork completely changed how I handle stress at work. I leave every class calmer and clearer — worth every minute."],
    ["Daniel R.", 5, false, "The only class I never skip. Strong, precise, and somehow still restorative."],
    ["Aisha K.", 5, false, "I booked a 1:1 before a big presentation and walked in grounded. Maya is the real deal."],
  ],
  "james-okafor": [
    ["Marcus T.", 5, true, "James makes you feel welcome from the very first minute. I went from never touching my toes to a daily practice."],
    ["Elena V.", 5, false, "Patient, encouraging, and genuinely knowledgeable about alignment. The best teacher I've had."],
    ["Sam O.", 4, false, "Great classes and such a calm presence. They fill up fast, so book early!"],
  ],
  "sofia-reyes": [
    ["Camila R.", 5, true, "Sofia's classes are the highlight of my week. I always leave lighter than I came in."],
    ["Nina P.", 5, false, "She remembers everyone's name and meets you exactly where you are. Rare and special."],
    ["Leo M.", 5, false, "Signed up for a pass after a single class. Couldn't recommend her more."],
  ],
};

let n = 0;
const id = () => `rev_demo${Date.now().toString(36)}${(n++).toString(36)}`;

for (const [slug, reviews] of Object.entries(REVIEWS)) {
  const [teacher] = await sql.query("select id, name from teachers where slug = $1", [slug]);
  if (!teacher) {
    console.log(`- ${slug}: not found, skipping`);
    continue;
  }
  await sql.query("delete from reviews where teacher_id = $1 and source = 'manual'", [teacher.id]);
  if (remove) {
    console.log(`- ${teacher.name}: reviews removed`);
    continue;
  }
  for (let i = 0; i < reviews.length; i++) {
    const [author, rating, featured, body] = reviews[i];
    // Spread created_at over recent weeks so ordering looks natural.
    const created = new Date(Date.now() - (i * 9 + 3) * 86400_000).toISOString();
    await sql.query(
      `insert into reviews (id, teacher_id, author_name, rating, body, source, featured, published, created_at)
       values ($1,$2,$3,$4,$5,'manual',$6,true,$7)`,
      [id(), teacher.id, author, rating, body, featured, created],
    );
  }
  console.log(`+ ${teacher.name}: ${reviews.length} demo reviews`);
}

console.log(remove ? "\nDone — demo reviews removed." : "\nDone — demo reviews seeded.");
