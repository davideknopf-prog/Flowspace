import { stripe } from "@/lib/stripe";
import type { Teacher } from "@/lib/types";
import {
  setTeacherStripeAccount,
  setTeacherConnectStatus,
  getTeacherByStripeAccountId,
} from "@/lib/repo";

// Stripe Connect (Express) helpers.
//
// Model: each teacher owns their own Express connected account. Student
// payments are created as *direct charges* on that account (see the booking /
// pass / quote actions), so the money settles to the teacher, Stripe's
// processing fee comes out of their sale, and Kuleo takes NO application fee —
// we monetize on the subscription. This also moves money-transmission and
// dispute liability onto Stripe + the teacher, off the platform.
//
// Server-only. Never import from a client component.

// Return the teacher's connected-account id, creating the Express account on
// first call. Idempotent: once an id exists on the teacher row we reuse it.
export async function getOrCreateConnectedAccount(
  teacher: Teacher,
): Promise<string> {
  if (teacher.stripeAccountId) return teacher.stripeAccountId;

  const account = await stripe.accounts.create({
    type: "express",
    email: teacher.email,
    business_type: "individual",
    // Accept card payments and receive payouts. That's all a teacher needs.
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: {
      name: teacher.name,
      product_description: "Yoga classes and sessions booked through Kuleo.",
    },
    metadata: { teacherId: teacher.id },
  });

  await setTeacherStripeAccount(teacher.id, account.id);
  return account.id;
}

// A one-time URL to Stripe's hosted onboarding (identity, bank, tax). Expires
// quickly and is single-use, so we mint a fresh one each time the teacher
// clicks "set up payouts". `refresh_url` is where Stripe sends them if the
// link expired mid-flow (we just mint another); `return_url` is where they
// land when done (we re-check status there).
export async function createOnboardingLink(
  accountId: string,
  origin: string,
): Promise<string> {
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/dashboard/payouts?refresh=1`,
    return_url: `${origin}/dashboard/payouts?done=1`,
    type: "account_onboarding",
  });
  return link.url;
}

// A link into the teacher's Express dashboard (view balance, change bank,
// see payouts). Only valid once onboarding is complete.
export async function createExpressLoginLink(
  accountId: string,
): Promise<string> {
  const link = await stripe.accounts.createLoginLink(accountId);
  return link.url;
}

// Read the live capability flags from Stripe and mirror them onto the teacher
// row. Called when the teacher returns from onboarding and from the
// account.updated webhook. Returns the fresh flags.
export async function refreshConnectStatus(
  teacher: Teacher,
): Promise<{ chargesEnabled: boolean; detailsSubmitted: boolean }> {
  if (!teacher.stripeAccountId) {
    return { chargesEnabled: false, detailsSubmitted: false };
  }
  const account = await stripe.accounts.retrieve(teacher.stripeAccountId);
  const flags = {
    chargesEnabled: Boolean(account.charges_enabled),
    detailsSubmitted: Boolean(account.details_submitted),
  };
  await setTeacherConnectStatus(teacher.id, flags);
  return flags;
}

// Webhook path: we get an account id, not a teacher. Look up the teacher and
// mirror the flags straight off the event's account object.
export async function syncConnectAccountToTeacher(
  account: { id: string; charges_enabled?: boolean; details_submitted?: boolean },
): Promise<void> {
  const teacher = await getTeacherByStripeAccountId(account.id);
  if (!teacher) return;
  await setTeacherConnectStatus(teacher.id, {
    chargesEnabled: Boolean(account.charges_enabled),
    detailsSubmitted: Boolean(account.details_submitted),
  });
}
