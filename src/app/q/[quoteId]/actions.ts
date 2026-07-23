"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  getQuote,
  attachQuoteStripeSession,
} from "@/lib/repo";
import { stripe } from "@/lib/stripe";

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

// Client pays a quote → Stripe Checkout. Confirmed by the webhook + the
// success-page fallback (same pattern as bookings/passes).
export async function payQuoteAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const quote = await getQuote(id);
  if (!quote) redirect("/");
  if (quote!.status !== "open") redirect(`/q/${id}`);
  if (quote!.expiresAt && new Date(quote!.expiresAt) < new Date()) {
    redirect(`/q/${id}`);
  }

  const origin = await siteOrigin();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: quote!.title },
          unit_amount: quote!.priceCents,
        },
        quantity: 1,
      },
    ],
    ...(quote!.clientEmail ? { customer_email: quote!.clientEmail } : {}),
    ...(quote!.clientEmail
      ? { payment_intent_data: { receipt_email: quote!.clientEmail } }
      : {}),
    success_url: `${origin}/q/${id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/q/${id}`,
    metadata: { quoteId: id },
  });

  await attachQuoteStripeSession(id, session.id);
  redirect(session.url!);
}
