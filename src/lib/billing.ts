import type Stripe from "stripe";
import { stripe } from "./stripe";
import { setTeacherSubscription } from "./repo";

// Teacher subscription plans. Prices live in Stripe, found by lookup_key so
// the same code works in test mode now and live mode at launch (run
// scripts/setup-stripe-prices.mjs in each mode).

export const PLAN_LOOKUP_KEYS = [
  "flowspace_weekly",
  "flowspace_monthly",
  "flowspace_annual",
] as const;

export interface Plan {
  lookupKey: string;
  priceId: string;
  amountCents: number;
  interval: string; // "week" | "month" | "year"
}

// Module-scope cache — prices essentially never change within a deploy's
// lifetime, and serverless instances are short-lived anyway.
let planCache: Plan[] | null = null;

export async function getPlans(): Promise<Plan[]> {
  if (planCache) return planCache;
  const res = await stripe.prices.list({
    lookup_keys: [...PLAN_LOOKUP_KEYS],
    limit: 10,
  });
  const plans = res.data
    .filter((p) => p.lookup_key && p.unit_amount != null && p.recurring)
    .map((p) => ({
      lookupKey: p.lookup_key!,
      priceId: p.id,
      amountCents: p.unit_amount!,
      interval: p.recurring!.interval,
    }));
  // Stable order: weekly, monthly, annual.
  plans.sort(
    (a, b) =>
      PLAN_LOOKUP_KEYS.indexOf(a.lookupKey as (typeof PLAN_LOOKUP_KEYS)[number]) -
      PLAN_LOOKUP_KEYS.indexOf(b.lookupKey as (typeof PLAN_LOOKUP_KEYS)[number]),
  );
  planCache = plans;
  return plans;
}

// Mirror a Stripe subscription's current state onto the teacher row.
// Called from the webhook and from post-checkout verification — both paths
// read the subscription fresh from Stripe, so repeats/races are harmless
// (last write reflects Stripe's latest state either way).
export async function syncSubscriptionToTeacher(
  teacherId: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const item = subscription.items.data[0];
  const plan = item?.price?.lookup_key ?? "";
  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000).toISOString()
    : null;

  await setTeacherSubscription(teacherId, {
    status: subscription.status,
    plan,
    periodEnd,
  });
}
