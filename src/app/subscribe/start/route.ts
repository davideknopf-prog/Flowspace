import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { isSubscribed } from "@/lib/types";
import { createSubscribeCheckout, PLAN_LOOKUP_KEYS } from "@/lib/billing";

export const dynamic = "force-dynamic";

// The one-click funnel: /subscribe/start?plan=kuleo_monthly
// - Signed out → signup (which round-trips back here after account creation).
// - Signed in, unsubscribed → straight into Stripe Checkout for that plan.
// - Already subscribed → dashboard.
// The /subscribe picker remains the fallback for anyone arriving without a
// plan in mind.
export async function GET(req: NextRequest) {
  const plan = req.nextUrl.searchParams.get("plan") ?? "";
  const origin = req.nextUrl.origin;

  if (!(PLAN_LOOKUP_KEYS as readonly string[]).includes(plan)) {
    return NextResponse.redirect(`${origin}/subscribe`);
  }

  const teacher = await getCurrentTeacher();
  if (!teacher) {
    return NextResponse.redirect(
      `${origin}/signup?plan=${encodeURIComponent(plan)}`,
    );
  }
  if (isSubscribed(teacher)) {
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  try {
    const url = await createSubscribeCheckout(teacher, plan, origin);
    if (url) return NextResponse.redirect(url);
  } catch (err) {
    console.error("[subscribe/start] checkout creation failed:", err);
  }
  return NextResponse.redirect(`${origin}/subscribe`);
}
