"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentTeacher } from "@/lib/session";
import { stripe } from "@/lib/stripe";
import { getPortalConfigId, getActiveSubscriptionId } from "@/lib/billing";

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

// Stripe's hosted Billing Portal: update card, see invoices, cancel — Stripe
// owns the UI so we never touch payment details.
export async function billingPortalAction() {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  if (!teacher!.stripeCustomerId) redirect("/subscribe");

  const origin = await siteOrigin();
  const session = await stripe.billingPortal.sessions.create({
    customer: teacher!.stripeCustomerId!,
    configuration: await getPortalConfigId(),
    return_url: `${origin}/dashboard/billing`,
  });
  redirect(session.url);
}

// Same portal, deep-linked straight into the cancel flow (at period end, so
// the teacher keeps what they paid for).
export async function cancelSubscriptionAction() {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  if (!teacher!.stripeCustomerId) redirect("/subscribe");

  const subscriptionId = await getActiveSubscriptionId(
    teacher!.stripeCustomerId!,
  );
  if (!subscriptionId) redirect("/dashboard/billing");

  const origin = await siteOrigin();
  const session = await stripe.billingPortal.sessions.create({
    customer: teacher!.stripeCustomerId!,
    configuration: await getPortalConfigId(),
    return_url: `${origin}/dashboard/billing`,
    flow_data: {
      type: "subscription_cancel",
      subscription_cancel: { subscription: subscriptionId! },
      after_completion: {
        type: "redirect",
        redirect: { return_url: `${origin}/dashboard/billing` },
      },
    },
  });
  redirect(session.url);
}
