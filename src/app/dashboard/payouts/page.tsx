import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/lib/session";
import { refreshConnectStatus } from "@/lib/connect";
import { isSubscribed } from "@/lib/types";
import {
  startPayoutOnboardingAction,
  openExpressDashboardAction,
} from "./actions";

// The "get paid" hub. Teachers connect their own Stripe account here; student
// payments then settle directly to them (Kuleo takes 0% of class revenue).
// Coming back from Stripe's hosted onboarding lands on ?done=1 / ?refresh=1 —
// in both cases we re-read the live status from Stripe before rendering.
export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; refresh?: string }>;
}) {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  const { done, refresh } = await searchParams;

  // Just returned from Stripe — pull the authoritative flags now, so the page
  // reflects reality without waiting for the webhook.
  let chargesEnabled = teacher.stripeChargesEnabled;
  let detailsSubmitted = teacher.stripeDetailsSubmitted;
  if ((done || refresh) && teacher.stripeAccountId) {
    const flags = await refreshConnectStatus(teacher);
    chargesEnabled = flags.chargesEnabled;
    detailsSubmitted = flags.detailsSubmitted;
  }

  const started = Boolean(teacher.stripeAccountId);
  const subscribed = isSubscribed(teacher);

  // Three states: not started, submitted-but-pending-review, live.
  const state = chargesEnabled
    ? "live"
    : detailsSubmitted
      ? "pending"
      : "start";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Get paid</h1>
        <p className="text-muted text-sm">
          Connect your own payout account so students pay you directly. Kuleo
          takes <span className="font-medium text-brand-dark">0% of your class revenue</span> —
          you keep everything except the standard card-processing fee.
        </p>
      </div>

      {state === "live" && (
        <section className="card !p-6 border-brand bg-brand-tint/50 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">✅</span>
            <h2 className="text-lg font-semibold">You&apos;re set up to get paid</h2>
          </div>
          <p className="text-sm text-muted">
            Your payout account is active. When a student books a paid class,
            the money goes straight to you and Stripe deposits it to your bank —
            usually within a couple of business days.
          </p>
          <form action={openExpressDashboardAction}>
            <button type="submit" className="btn-secondary text-sm">
              View balance &amp; payouts ↗
            </button>
          </form>
        </section>
      )}

      {state === "pending" && (
        <section className="card !p-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⏳</span>
            <h2 className="text-lg font-semibold">Almost there</h2>
          </div>
          <p className="text-sm text-muted">
            Thanks — Stripe is reviewing your details. This is usually quick.
            You&apos;ll be able to take payments the moment it clears; nothing
            more is needed from you right now. If Stripe asked for anything else,
            you can pick up where you left off below.
          </p>
          <form action={startPayoutOnboardingAction}>
            <button type="submit" className="btn-secondary text-sm">
              Continue Stripe setup
            </button>
          </form>
        </section>
      )}

      {state === "start" && (
        <section className="card !p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">
              Set up payouts in a couple of minutes
            </h2>
            <p className="text-sm text-muted">
              We use Stripe to pay you securely. You&apos;ll confirm a few
              details and where to deposit your earnings. You only do this once.
            </p>
          </div>
          <ul className="text-sm text-muted space-y-1.5">
            <li>• Money from your classes lands in your bank automatically</li>
            <li>• Kuleo never takes a cut of your class revenue</li>
            <li>• Bank-level security, handled by Stripe</li>
          </ul>
          <form action={startPayoutOnboardingAction}>
            <button type="submit" className="btn-primary">
              {started ? "Continue setting up payouts →" : "Set up payouts →"}
            </button>
          </form>
          {!subscribed && (
            <p className="text-xs text-muted">
              You can set up payouts now; your studio opens for bookings once
              you go live.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
