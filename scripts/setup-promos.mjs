// One-off: create the launch promotion codes in Stripe, idempotently (safe
// to re-run; skips anything that already exists). Like setup-stripe-prices,
// run once per mode: test now, live at launch. npm run stripe:promos
//
// Terms ("launch-friendly mix"):
//   yogafree — 100% off for the first 3 months, then full price
//   yoga10   — 10% off every invoice for 12 months
//   yoga25   — 25% off every invoice for 12 months
//
// ⚠️ Heads-up when handing out codes: coupons apply to any plan, so a
// 3-month-window coupon fully covers an ANNUAL plan's first invoice —
// yogafree on Annual = the whole first year free. Point free-code teachers
// at Weekly or Monthly.
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

const PROMOS = [
  {
    code: "yogafree",
    name: "Launch: first 3 months free",
    percentOff: 100,
    durationMonths: 3,
  },
  {
    code: "yoga10",
    name: "Launch: 10% off for a year",
    percentOff: 10,
    durationMonths: 12,
  },
  {
    code: "yoga25",
    name: "Launch: 25% off for a year",
    percentOff: 25,
    durationMonths: 12,
  },
];

// Earlier runs may have created a coupon and then crashed before the code
// (the promotion_codes API changed shape) — reuse a matching coupon when one
// exists and clean up unredeemed duplicates, instead of minting more.
const allCoupons = await stripe.coupons.list({ limit: 100 });

for (const promo of PROMOS) {
  const existing = await stripe.promotionCodes.list({
    code: promo.code,
    limit: 1,
  });
  if (existing.data.length > 0) {
    console.log(`✓ ${promo.code} already exists (${existing.data[0].id})`);
    continue;
  }

  const matching = allCoupons.data.filter((c) => c.name === promo.name);
  let coupon = matching[0] ?? null;
  for (const dupe of matching.slice(1)) {
    if (dupe.times_redeemed === 0) {
      await stripe.coupons.del(dupe.id);
      console.log(`  (cleaned up duplicate coupon ${dupe.id})`);
    }
  }
  if (!coupon) {
    coupon = await stripe.coupons.create({
      name: promo.name,
      percent_off: promo.percentOff,
      duration: "repeating",
      duration_in_months: promo.durationMonths,
    });
  }

  // Current API shape: the coupon rides inside a `promotion` object.
  const code = await stripe.promotionCodes.create({
    promotion: { type: "coupon", coupon: coupon.id },
    code: promo.code,
  });
  console.log(`Created ${promo.code}: ${promo.percentOff}% off for ${promo.durationMonths} months (${code.id})`);
}

console.log("Done.");
