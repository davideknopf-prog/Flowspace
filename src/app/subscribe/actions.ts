"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentTeacher } from "@/lib/session";
import { stripe } from "@/lib/stripe";
import { getPlans } from "@/lib/billing";
import { setTeacherStripeCustomer } from "@/lib/repo";

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

export async function subscribeAction(formData: FormData) {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  const lookupKey = String(formData.get("plan") ?? "");
  const plans = await getPlans();
  const plan = plans.find((p) => p.lookupKey === lookupKey);
  if (!plan) redirect("/subscribe?error=Pick+a+plan");

  // One Stripe customer per teacher, created lazily on first subscribe.
  let customerId = teacher!.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: teacher!.email,
      name: teacher!.name,
      metadata: { teacherId: teacher!.id },
    });
    customerId = customer.id;
    await setTeacherStripeCustomer(teacher!.id, customerId);
  }

  const origin = await siteOrigin();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: plan!.priceId, quantity: 1 }],
    success_url: `${origin}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/subscribe`,
    metadata: { teacherId: teacher!.id },
  });

  redirect(session.url!);
}
