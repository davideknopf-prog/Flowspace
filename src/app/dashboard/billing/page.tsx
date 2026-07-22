import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/lib/session";
import { getPlans } from "@/lib/billing";
import { formatPrice } from "@/lib/format";
import { billingPortalAction, cancelSubscriptionAction } from "./actions";

const PLAN_LABELS: Record<string, string> = {
  kuleo_weekly: "Weekly",
  kuleo_monthly: "Monthly",
  kuleo_annual: "Annual",
};

const STATUS_COPY: Record<string, { label: string; tone: string }> = {
  active: { label: "Active", tone: "bg-green-100 text-green-800" },
  trialing: { label: "Trial", tone: "bg-green-100 text-green-800" },
  past_due: { label: "Past due", tone: "bg-amber-100 text-amber-800" },
  canceled: { label: "Canceled", tone: "bg-gray-100 text-gray-600" },
};

export default async function BillingPage() {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  const plans = await getPlans();
  const plan = plans.find((p) => p.lookupKey === teacher!.subscriptionPlan);
  const status = STATUS_COPY[teacher!.subscriptionStatus] ?? {
    label: teacher!.subscriptionStatus || "None",
    tone: "bg-gray-100 text-gray-600",
  };
  const renews = teacher!.subscriptionPeriodEnd
    ? new Date(teacher!.subscriptionPeriodEnd).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const canManage = Boolean(teacher!.stripeCustomerId);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-1">Billing</h1>
      <p className="text-sm text-muted mb-6">
        Your Kuleo subscription — separate from your students&apos; payments,
        which land in Earnings.
      </p>

      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">
              {PLAN_LABELS[teacher!.subscriptionPlan] ?? "Kuleo Teacher Plan"}
              {plan && (
                <span className="text-muted font-normal">
                  {" "}
                  · {formatPrice(plan.amountCents)}/{plan.interval}
                </span>
              )}
            </p>
            {renews && (
              <p className="text-sm text-muted mt-0.5">
                {teacher!.subscriptionStatus === "canceled"
                  ? `Access until ${renews}`
                  : `Renews ${renews}`}
              </p>
            )}
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.tone}`}
          >
            {status.label}
          </span>
        </div>

        {canManage ? (
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <form action={billingPortalAction}>
              <button type="submit" className="btn-primary text-sm">
                Manage billing
              </button>
            </form>
            <p className="text-xs text-muted">
              Update your card, download invoices, or change your plan —
              handled securely by Stripe.
            </p>
          </div>
        ) : (
          <p className="mt-5 border-t border-border pt-4 text-sm text-muted">
            No billing history yet.
          </p>
        )}
      </div>

      {canManage &&
        ["active", "trialing", "past_due"].includes(
          teacher!.subscriptionStatus,
        ) && (
          <div className="card mt-4">
            <p className="font-medium text-sm">Cancel subscription</p>
            <p className="text-xs text-muted mt-1 mb-3">
              Your page, schedule, and booking link stay live until the end of
              what you&apos;ve paid for. Your earnings are always yours to cash
              out, subscribed or not.
            </p>
            <form action={cancelSubscriptionAction}>
              <button
                type="submit"
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-danger hover:bg-red-50 transition-colors"
              >
                Cancel subscription
              </button>
            </form>
          </div>
        )}
    </div>
  );
}
