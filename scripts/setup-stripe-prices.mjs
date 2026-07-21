// One-off: create the Flowspace teacher subscription product + prices in
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
  { lookupKey: "flowspace_weekly", amountCents: 750, interval: "week", label: "Weekly" },
  { lookupKey: "flowspace_monthly", amountCents: 1500, interval: "month", label: "Monthly" },
  { lookupKey: "flowspace_annual", amountCents: 9000, interval: "year", label: "Annual" },
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
    name: "Flowspace Teacher Plan",
    description: "Your yoga business OS: profile, scheduling, payments, and more.",
  });
  product = created.id;
  console.log("Created product:", product);
}

for (const plan of PLANS) {
  if (existingKeys.has(plan.lookupKey)) {
    console.log(`✓ ${plan.label} already exists (${plan.lookupKey})`);
    continue;
  }
  const price = await stripe.prices.create({
    product: typeof product === "string" ? product : product.id,
    unit_amount: plan.amountCents,
    currency: "usd",
    recurring: { interval: plan.interval },
    lookup_key: plan.lookupKey,
    nickname: `Flowspace ${plan.label}`,
  });
  console.log(`+ Created ${plan.label}: ${price.id} ($${plan.amountCents / 100}/${plan.interval})`);
}

console.log("\nDone. Prices are resolved at runtime by lookup_key — no IDs to copy.");
