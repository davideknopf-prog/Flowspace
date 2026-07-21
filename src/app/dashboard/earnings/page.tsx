import { getCurrentTeacher } from "@/lib/session";
import { redirect } from "next/navigation";
import { getEarningsSummary, listPayouts } from "@/lib/repo";
import { formatPrice } from "@/lib/format";

export default async function EarningsPage() {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  const [summary, payouts] = await Promise.all([
    getEarningsSummary(teacher.id),
    listPayouts(teacher.id),
  ]);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Earnings</h1>
        <p className="text-muted text-sm">
          What you&apos;ve earned from paid bookings, and what&apos;s been paid out to you.
        </p>
      </div>

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

      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center">
          <p className="text-sm text-muted mb-1">Total earned</p>
          <p className="text-2xl font-semibold">
            {formatPrice(
              summary.totalPaidCents -
                summary.totalPlatformFeeCents -
                summary.totalStripeFeeCents,
            )}
          </p>
        </div>
        <div className="card text-center bg-brand-tint/50">
          <p className="text-sm text-muted mb-1">Balance owed to you</p>
          <p className="text-2xl font-semibold text-brand-dark">
            {formatPrice(Math.max(0, summary.balanceCents))}
          </p>
        </div>
      </div>

      <div className="card text-sm space-y-2">
        <p className="font-medium mb-1">How this is calculated</p>
        <Row label="Collected from students" value={formatPrice(summary.totalPaidCents)} />
        <Row
          label="Stripe processing fee"
          value={`− ${formatPrice(summary.totalStripeFeeCents)}`}
        />
        <Row
          label="Platform fee"
          value={`− ${formatPrice(summary.totalPlatformFeeCents)}`}
        />
        <div className="border-t border-border my-2" />
        <Row
          label="Your earnings"
          value={formatPrice(
            summary.totalPaidCents -
              summary.totalPlatformFeeCents -
              summary.totalStripeFeeCents,
          )}
          bold
        />
        <Row
          label="Already paid out"
          value={`− ${formatPrice(summary.totalPayoutCents)}`}
        />
      </div>

      <div className="card text-sm text-muted">
        Payments are collected securely via Stripe. Stripe charges its own
        processing fee (typically ~2.9% + $0.30) on every transaction — this
        comes out of your earnings, same as it would on any other payment
        platform. There&apos;s no automatic payout schedule yet — you&apos;ll
        be paid manually while Flowspace is in its early days, and this page
        always reflects the accurate running balance.
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Payout history</h2>
        {payouts.length === 0 ? (
          <div className="card text-center py-8 text-sm text-muted">
            No payouts recorded yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {payouts.map((p) => (
              <li key={p.id} className="card !p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{formatPrice(p.amountCents)}</p>
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
