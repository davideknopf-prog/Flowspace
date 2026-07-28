"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentTeacher } from "@/lib/session";
import {
  getOrCreateConnectedAccount,
  createOnboardingLink,
  createExpressLoginLink,
} from "@/lib/connect";

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

// Start (or resume) Stripe's hosted Express onboarding: identity, bank, tax.
// Creates the connected account on first click, then redirects to Stripe.
export async function startPayoutOnboardingAction() {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  const accountId = await getOrCreateConnectedAccount(teacher!);
  const origin = await siteOrigin();
  const url = await createOnboardingLink(accountId, origin);
  redirect(url);
}

// Send an already-onboarded teacher into their Stripe Express dashboard to
// see their balance, payouts, and change their bank.
export async function openExpressDashboardAction() {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  if (!teacher!.stripeAccountId) redirect("/dashboard/payouts");

  const url = await createExpressLoginLink(teacher!.stripeAccountId);
  redirect(url);
}
