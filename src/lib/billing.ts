import type Stripe from "stripe";
import { stripe } from "./stripe";
import { setTeacherSubscription } from "./repo";

// Teacher subscription plans. Prices live in Stripe, found by lookup_key so
// the same code works in test mode now and live mode at launch (run
// scripts/setup-stripe-prices.mjs in each mode).

export const PLAN_LOOKUP_KEYS = [
  "kuleo_weekly",
  "kuleo_monthly",
  "kuleo_annual",
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

// Stripe's hosted Billing Portal needs a portal "configuration". The Stripe
// dashboard only creates a default one once you save portal settings by hand,
// so we ensure one exists via API instead — works identically in test mode
// now and live mode at launch. Cached at module scope like plans.
let portalConfigCache: string | null = null;

export async function getPortalConfigId(): Promise<string> {
  if (portalConfigCache) return portalConfigCache;
  const existing = await stripe.billingPortal.configurations.list({
    active: true,
    limit: 1,
  });
  if (existing.data.length > 0) {
    portalConfigCache = existing.data[0].id;
    return portalConfigCache;
  }
  const created = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: "Kuleo — manage your teacher subscription",
    },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ["email", "address"] },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
    },
  });
  portalConfigCache = created.id;
  return portalConfigCache;
}

// The teacher's current Stripe subscription, if any. Used for the portal's
// cancel deep link; the teacher row only mirrors status, not the sub id.
export async function getActiveSubscriptionId(
  customerId: string,
): Promise<string | null> {
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 5,
  });
  const current = subs.data.find((s) =>
    ["active", "trialing", "past_due"].includes(s.status),
  );
  return current?.id ?? null;
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
