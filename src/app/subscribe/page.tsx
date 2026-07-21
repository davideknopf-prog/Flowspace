import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/lib/session";
import { isSubscribed } from "@/lib/types";
import { getPlans } from "@/lib/billing";
import { subscribeAction } from "./actions";
import { SignOutButton } from "@clerk/nextjs";

const PLAN_COPY: Record<
  string,
  { title: string; cadence: string; note: string; highlight?: boolean }
> = {
  flowspace_weekly: {
    title: "Weekly",
    cadence: "per week",
    note: "Great for trying things out.",
  },
  flowspace_monthly: {
    title: "Monthly",
    cadence: "per month",
    note: "Most popular with teachers.",
    highlight: true,
  },
  flowspace_annual: {
    title: "Annual",
    cadence: "per year",
    note: "Two months free vs. monthly.",
  },
};

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  if (isSubscribed(teacher!)) redirect("/dashboard");
  const { error } = await searchParams;

  const plans = await getPlans();

  return (
    <main className="min-h-screen px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-10 flex items-center gap-2 justify-center text-brand-dark font-semibold text-lg"
        >
          <span className="text-2xl">🧘</span> Flowspace
        </Link>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold mb-2">
            Pick your plan, {teacher!.name.split(" ")[0]}
          </h1>
          <p className="text-muted max-w-md mx-auto">
            One subscription, your whole teaching business: profile, booking
            link, scheduling, and payments. Cancel anytime.
          </p>
        </div>

        {error && (
          <p className="mb-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger text-center">
            {error}
          </p>
        )}

        <div className="grid sm:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const copy = PLAN_COPY[plan.lookupKey];
            if (!copy) return null;
            return (
              <form
                key={plan.lookupKey}
                action={subscribeAction}
                className={`card flex flex-col text-center relative ${
                  copy.highlight ? "border-brand ring-2 ring-[var(--ring)]" : ""
                }`}
              >
                {copy.highlight && (
                  <span className="pill absolute -top-3 left-1/2 -translate-x-1/2">
                    Most popular
                  </span>
                )}
                <input type="hidden" name="plan" value={plan.lookupKey} />
                <h2 className="font-semibold text-lg mt-2">{copy.title}</h2>
                <p className="text-3xl font-semibold my-3">
                  ${(plan.amountCents / 100).toFixed(plan.amountCents % 100 === 0 ? 0 : 2)}
                  <span className="text-sm font-normal text-muted">
                    {" "}
                    {copy.cadence}
                  </span>
                </p>
                <p className="text-sm text-muted mb-5 flex-1">{copy.note}</p>
                <button
                  type="submit"
                  className={copy.highlight ? "btn-primary w-full" : "btn-secondary w-full"}
                >
                  Choose {copy.title}
                </button>
              </form>
            );
          })}
        </div>

        <div className="mt-8 text-center text-sm text-muted space-y-2">
          <p>
            Secure checkout via Stripe. Your students never pay Flowspace —
            this is just your tool subscription.
          </p>
          <SignOutButton redirectUrl="/">
            <button className="underline hover:text-foreground" type="button">
              Log out
            </button>
          </SignOutButton>
        </div>
      </div>
    </main>
  );
}
