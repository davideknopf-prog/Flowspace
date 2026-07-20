// Founder-only tool to record that you paid a teacher out (bank transfer,
// Venmo, whatever — there's no automated payout rail yet). Not exposed in
// the app UI since there's no admin role system yet; just run this locally.
//
// Usage:
//   npm run payout -- <teacher-email-or-slug> <amount-in-dollars> ["a note"]
//
// Example:
//   npm run payout -- jane@example.com 145.00 "July 1-15 batch"
import { fileURLToPath } from "url";
import path from "path";
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const [, , identifier, amountArg, ...noteParts] = process.argv;
const note = noteParts.join(" ");

if (!identifier || !amountArg) {
  console.error(
    'Usage: npm run payout -- <teacher-email-or-slug> <amount-in-dollars> ["note"]',
  );
  process.exit(1);
}

const amountCents = Math.round(Number(amountArg) * 100);
if (!Number.isFinite(amountCents) || amountCents <= 0) {
  console.error(`Invalid amount: ${amountArg}`);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not found — run `vercel env pull .env.local` first.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

const teachers = await sql.query(
  "select * from teachers where lower(email) = $1 or slug = $1",
  [identifier.toLowerCase()],
);
const teacher = teachers[0];
if (!teacher) {
  console.error(`No teacher found matching "${identifier}" (checked email and slug).`);
  process.exit(1);
}

const [bookingTotals] = await sql.query(
  `select
     coalesce(sum(price_cents), 0) as total_price,
     coalesce(sum(platform_fee_cents), 0) as total_platform_fee,
     coalesce(sum(stripe_fee_cents), 0) as total_stripe_fee
   from bookings where teacher_id = $1 and payment_status = 'paid'`,
  [teacher.id],
);
const [payoutTotals] = await sql.query(
  "select coalesce(sum(amount_cents), 0) as total_payout from payouts where teacher_id = $1",
  [teacher.id],
);

const earnedCents =
  Number(bookingTotals.total_price) -
  Number(bookingTotals.total_platform_fee) -
  Number(bookingTotals.total_stripe_fee);
const alreadyPaidCents = Number(payoutTotals.total_payout);
const balanceCents = earnedCents - alreadyPaidCents;

console.log(`\n${teacher.name} (${teacher.email})`);
console.log(`  Earned so far:     $${(earnedCents / 100).toFixed(2)}`);
console.log(`  Already paid out:  $${(alreadyPaidCents / 100).toFixed(2)}`);
console.log(`  Current balance:   $${(balanceCents / 100).toFixed(2)}`);

if (amountCents > balanceCents) {
  console.warn(
    `\n⚠ You're recording $${(amountCents / 100).toFixed(2)}, more than the $${(balanceCents / 100).toFixed(2)} balance owed. Proceeding anyway — double check this is intentional.`,
  );
}

const id = `pay_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
await sql.query(
  "insert into payouts (id, teacher_id, amount_cents, note) values ($1, $2, $3, $4)",
  [id, teacher.id, amountCents, note],
);

console.log(
  `\n✓ Recorded payout of $${(amountCents / 100).toFixed(2)} to ${teacher.name}.`,
);
console.log(`  New balance: $${((balanceCents - amountCents) / 100).toFixed(2)}`);
