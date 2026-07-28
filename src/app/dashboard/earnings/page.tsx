import { getCurrentTeacher } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getEarningsSummary,
  getWeeklyNetEarnings,
} from "@/lib/repo";
import { formatMoney } from "@/lib/format";
import { WeeklyEarningsChart } from "@/components/WeeklyEarningsChart";
import { openExpressDashboardAction } from "../payouts/actions";

// The "money feel" page. Kuleo takes 0% of class revenue — student payments
// settle directly to the teacher's own Stripe account, and Stripe deposits to
// their bank automatically. So this page celebrates the number and hands off
// to Stripe for the actual balance/payout details, rather than running a
// manual cash-out.

export default async function EarningsPage() {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  const [summary, weekly] = await Promise.all([
    getEarningsSummary(teacher.id),
    getWeeklyNetEarnings(teacher.id, 8),
  ]);

  // Kuleo takes nothing, so what a teacher earns is simply what students paid.
  // (totalPlatformFeeCents is 0 going forward; subtracted for legacy safety.)
  const earnedCents = summary.totalPaidCents - summary.totalPlatformFeeCents;
  const thisWeekCents = weekly[weekly.length - 1]?.netCents ?? 0;
  const hasEarnings = earnedCents > 0;
  const connected = Boolean(teacher.stripeAccountId && teacher.stripeChargesEnabled);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Earnings</h1>
        <p className="text-muted text-sm">
          {hasEarnings
            ? "Your money at a glance — paid straight to your bank by Stripe."
            : "Your earnings land here. You keep 100% of your class price (minus the standard card-processing fee) — Kuleo never takes a cut."}
        </p>
      </div>

      {/* Hero: the number the page exists for */}
      <section className="card !p-8 bg-gradient-to-br from-brand-tint to-surface">
        <p className="text-sm font-medium text-brand-dark">
          Total earned with Kuleo
        </p>
        <p className="mt-1 text-5xl font-semibold tracking-tight">
          {formatMoney(earnedCents)}
        </p>
        {thisWeekCents > 0 && (
          <p className="mt-2 text-sm text-muted">
            <span className="font-medium text-brand-dark">
              +{formatMoney(thisWeekCents)}
            </span>{" "}
            this week 🎉
          </p>
        )}

        {hasEarnings && (
          <div className="mt-6">
            <WeeklyEarningsChart series={weekly} />
          </div>
        )}

        <div className="mt-6 border-t border-border pt-5">
          {connected ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted">Payouts</p>
                <p className="text-sm text-foreground">
                  Deposited to your bank automatically, usually within 1–2
                  business days.
                </p>
              </div>
              <form action={openExpressDashboardAction}>
                <button type="submit" className="btn-secondary text-sm shrink-0">
                  View balance &amp; payouts ↗
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted">Get paid</p>
                <p className="text-sm text-foreground">
                  Connect your payout account so students can pay you.
                </p>
              </div>
              <Link href="/dashboard/payouts" className="btn-primary text-sm shrink-0">
                Set up payouts →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Activity stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center !p-4">
          <p className="text-2xl font-semibold">{summary.uniqueStudents}</p>
          <p className="text-xs text-muted">students</p>
        </div>
        <div className="card text-center !p-4">
          <p className="text-2xl font-semibold">{summary.classesBooked}</p>
          <p className="text-xs text-muted">classes booked</p>
        </div>
        <div className="card text-center !p-4">
          <p className="text-2xl font-semibold">{summary.passesSold}</p>
          <p className="text-xs text-muted">passes sold</p>
        </div>
      </div>

      {/* How the money works, tucked away by default */}
      <details className="card !p-0 overflow-hidden">
        <summary className="cursor-pointer list-none px-6 py-4 text-sm font-medium hover:bg-brand-tint/40">
          How your money works ▾
        </summary>
        <div className="border-t border-border px-6 py-4 text-sm space-y-2">
          <Row
            label="Collected from students"
            value={formatMoney(summary.totalPaidCents)}
          />
          <Row label="Kuleo commission" value="$0.00" />
          <p className="text-xs text-muted pt-2">
            Kuleo takes <span className="font-medium text-brand-dark">0% of your class revenue</span> —
            we make our money on your subscription, not your students. Payments
            go straight to your own Stripe account; Stripe&apos;s standard
            card-processing fee is deducted from each sale, and Stripe deposits
            the rest to your bank automatically. Your exact balance and payout
            history live in your Stripe dashboard.
          </p>
        </div>
      </details>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : "text-muted"}`}>
      <span>{label}</span>
      <span className={bold ? "text-foreground" : ""}>{value}</span>
    </div>
  );
}
