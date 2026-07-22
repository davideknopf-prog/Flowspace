import { getCurrentTeacher } from "@/lib/session";
import { redirect } from "next/navigation";
import {
  getEarningsSummary,
  listPayouts,
  getWeeklyNetEarnings,
  getPendingPayoutRequest,
} from "@/lib/repo";
import { formatMoney } from "@/lib/format";
import { payoutMethodLabel } from "@/lib/types";
import { CashOutButton } from "@/components/CashOutButton";
import { WeeklyEarningsChart } from "@/components/WeeklyEarningsChart";

// The "money feel" page: one celebratory number, momentum, and a cash-out
// button. Fees are deliberately NOT itemized here — they live in the
// collapsible math below and in the cash-out dialog.

export default async function EarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ requested?: string; error?: string }>;
}) {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  const { requested, error } = await searchParams;

  const [summary, payouts, weekly, pendingRequest] = await Promise.all([
    getEarningsSummary(teacher.id),
    listPayouts(teacher.id),
    getWeeklyNetEarnings(teacher.id, 8),
    getPendingPayoutRequest(teacher.id),
  ]);

  const earnedCents =
    summary.totalPaidCents -
    summary.totalPlatformFeeCents -
    summary.totalStripeFeeCents;
  const feeCents = summary.totalPlatformFeeCents + summary.totalStripeFeeCents;
  const availableCents = Math.max(0, summary.balanceCents);
  const thisWeekCents = weekly[weekly.length - 1]?.netCents ?? 0;
  const hasEarnings = earnedCents > 0;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Earnings</h1>
        <p className="text-muted text-sm">
          {hasEarnings
            ? "Your money at a glance — cash out whenever you like."
            : "Every dollar a student pays lands here — Kuleo takes no cut. Your first booking starts the chart."}
        </p>
      </div>

      {requested && (
        <div className="card !p-4 border-brand bg-brand-tint/60 text-sm">
          💸 <span className="font-medium">Your cash-out request is in!</span>{" "}
          David has been notified and will send your money shortly.
        </div>
      )}
      {error === "empty" && (
        <div className="card !p-4 text-sm text-muted">
          Nothing to cash out just yet — your balance updates the moment a
          student pays.
        </div>
      )}
      {error === "method" && (
        <div className="card !p-4 border-danger text-sm text-danger">
          Pick a payout method and enter your handle to cash out.
        </div>
      )}
      {error === "retry" && (
        <div className="card !p-4 border-danger text-sm text-danger">
          Something went wrong sending your request — please try again in a
          moment.
        </div>
      )}

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
          {pendingRequest ? (
            <div className="flex items-start gap-3 text-sm">
              <span className="text-xl">💸</span>
              <div className="min-w-0">
                <p className="font-medium break-words">
                  {formatMoney(pendingRequest.amountCents)} is on its way to
                  your {payoutMethodLabel(pendingRequest.method)} (
                  {pendingRequest.handle})
                </p>
                <p className="text-muted">
                  Requested{" "}
                  {new Date(pendingRequest.createdAt).toLocaleDateString()} —
                  usually arrives within 1–2 business days.
                </p>
              </div>
            </div>
          ) : availableCents > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted">Available to cash out</p>
                <p className="text-xl font-semibold text-brand-dark">
                  {formatMoney(availableCents)}
                </p>
              </div>
              <CashOutButton
                balanceCents={availableCents}
                collectedCents={summary.totalPaidCents}
                feeCents={feeCents}
                paidOutCents={summary.totalPayoutCents}
                savedMethod={teacher.payoutMethod}
                savedHandle={teacher.payoutHandle}
              />
            </div>
          ) : (
            <p className="text-sm text-muted">
              {hasEarnings
                ? "You're all caught up — everything you've earned has been paid out. 🙌"
                : "Share your booking page and this number starts climbing."}
            </p>
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

      {/* The full math, tucked away by default */}
      <details className="card !p-0 overflow-hidden">
        <summary className="cursor-pointer list-none px-6 py-4 text-sm font-medium hover:bg-brand-tint/40">
          See the full math ▾
        </summary>
        <div className="border-t border-border px-6 py-4 text-sm space-y-2">
          <Row
            label="Collected from students"
            value={formatMoney(summary.totalPaidCents)}
          />
          <Row
            label="Stripe processing fee"
            value={`− ${formatMoney(summary.totalStripeFeeCents)}`}
          />
          <Row
            label="Platform fee"
            value={`− ${formatMoney(summary.totalPlatformFeeCents)}`}
          />
          <div className="border-t border-border my-2" />
          <Row label="Your earnings" value={formatMoney(earnedCents)} bold />
          <Row
            label="Already paid out"
            value={`− ${formatMoney(summary.totalPayoutCents)}`}
          />
          <Row
            label="Available to cash out"
            value={formatMoney(availableCents)}
            bold
          />
          <p className="text-xs text-muted pt-2">
            Payments are collected securely via Stripe, which charges its own
            processing fee (typically ~2.9% + $0.30) on every transaction —
            same as on any other payment platform. This page always reflects
            your accurate live balance.
          </p>
        </div>
      </details>

      <section>
        <h2 className="text-lg font-semibold mb-3">Cash-out history</h2>
        {payouts.length === 0 && !pendingRequest ? (
          <div className="card text-center py-8 text-sm text-muted">
            No cash-outs yet — your first one is a button-click away.
          </div>
        ) : (
          <ul className="space-y-2">
            {pendingRequest && (
              <li className="card !p-4 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-medium">
                    {formatMoney(pendingRequest.amountCents)}
                  </p>
                  <p className="text-sm text-muted break-words">
                    Via {payoutMethodLabel(pendingRequest.method)} (
                    {pendingRequest.handle})
                  </p>
                </div>
                <span className="pill !bg-accent/15 !text-accent shrink-0">
                  Pending
                </span>
              </li>
            )}
            {payouts.map((p) => (
              <li key={p.id} className="card !p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{formatMoney(p.amountCents)}</p>
                  {p.note && <p className="text-sm text-muted">{p.note}</p>}
                </div>
                <p className="text-xs text-muted">
                  {new Date(p.createdAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
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
