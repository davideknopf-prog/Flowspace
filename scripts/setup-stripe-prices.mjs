// One-off: create the Kuleo teacher subscription product + prices in
// Stripe, idempotently (safe to re-run; skips anything that already exists).
// Prices are found at runtime by lookup_key, so the same script works for
// test mode now and live mode at launch: npm run stripe:setup
import { fileURLToPath } from "url";
import path from "path";
import Stripe from "stripe";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("STRIPE_SECRET_KEY not found — run `vercel env pull .env.local` first.");
  process.exit(1);
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PLANS = [
  { lookupKey: "kuleo_monthly", amountCents: 1474, interval: "month", label: "Monthly" },
  { lookupKey: "kuleo_annual", amountCents: 13266, interval: "year", label: "Annual" },
];

const existing = await stripe.prices.list({
  lookup_keys: PLANS.map((p) => p.lookupKey),
  limit: 10,
});
const existingKeys = new Set(existing.data.map((p) => p.lookup_key));

let product = null;
if (existing.data.length > 0) {
  product = existing.data[0].product;
} else {
  const created = await stripe.products.create({
    name: "Kuleo Teacher Plan",
    description: "Your yoga business OS: profile, scheduling, payments, and more.",
  });
  product = created.id;
  console.log("Created product:", product);
}

void existingKeys; // (kept for compatibility; matching is done per-plan below)

for (const plan of PLANS) {
  // Is there already an active price with this lookup_key AND the exact amount?
  const forKey = existing.data.filter(
    (p) => p.lookup_key === plan.lookupKey && p.active,
  );
  const match = forKey.find(
    (p) => p.unit_amount === plan.amountCents && p.recurring?.interval === plan.interval,
  );
  if (match) {
    console.log(`✓ ${plan.label} already correct (${plan.lookupKey}, $${plan.amountCents / 100})`);
    continue;
  }
  // Create the new price and MOVE the lookup_key onto it. Any old price keeps
  // working for existing subscribers (grandfathered) but new checkouts use this.
  const price = await stripe.prices.create({
    product: typeof product === "string" ? product : product.id,
    unit_amount: plan.amountCents,
    currency: "usd",
    recurring: { interval: plan.interval },
    lookup_key: plan.lookupKey,
    transfer_lookup_key: true,
    nickname: `Kuleo ${plan.label}`,
  });
  console.log(
    `+ Set ${plan.label}: ${price.id} ($${plan.amountCents / 100}/${plan.interval}) — lookup_key transferred`,
  );
}

console.log("\nDone. Prices are resolved at runtime by lookup_key — no IDs to copy.");
