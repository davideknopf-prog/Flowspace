import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/lib/session";
import { isSubscribed } from "@/lib/types";
import { PRICING } from "@/lib/billing";
import { subscribeAction } from "./actions";
import { SignOutButton } from "@clerk/nextjs";

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  if (isSubscribed(teacher!)) redirect("/dashboard");
  const { error } = await searchParams;

  return (
    <main className="min-h-screen px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-10 flex items-baseline justify-center text-xl font-semibold tracking-tight text-brand-dark [font-family:var(--font-display)]"
        >
          Kuleo<span className="text-accent">.</span>
        </Link>

        <div className="text-center mb-10">
          <p className="inline-flex items-center gap-2 rounded-full bg-brand-tint px-3 py-1 text-xs font-semibold text-brand-dark mb-4">
            🌱 Go live · 14-day free trial
          </p>
          <h1 className="text-3xl font-semibold mb-2">
            Open your studio, {teacher!.name.split(" ")[0]}
          </h1>
          <p className="text-muted max-w-md mx-auto">
            Your studio goes live today and starts taking bookings. Try it free
            for 14 days — you won&apos;t be charged until then, and you can
            cancel anytime. Students always pay you directly.
          </p>
        </div>

        {error && (
          <p className="mb-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger text-center">
            {error}
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-4 items-stretch">
          {/* Monthly */}
          <form action={subscribeAction} className="card flex flex-col text-center !p-7">
            <input type="hidden" name="plan" value={PRICING.monthly.lookupKey} />
            <h2 className="font-semibold text-lg">Monthly</h2>
            <p className="mt-3 text-4xl font-semibold [font-family:var(--font-display)]">
              {PRICING.monthly.perMonth}
              <span className="text-sm font-normal text-muted"> /mo</span>
            </p>
            <p className="mt-2 text-sm text-muted flex-1">
              free for 14 days, then {PRICING.monthly.perMonth}/mo · {PRICING.monthly.sub}
            </p>
            <button type="submit" className="btn-secondary w-full mt-5">
              Start free trial →
            </button>
          </form>

          {/* Annual — best value */}
          <form
            action={subscribeAction}
            className="card flex flex-col text-center relative border-brand ring-2 ring-[var(--ring)] !p-7"
          >
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3 py-0.5 text-[11px] font-semibold text-white">
              BEST VALUE · {PRICING.annual.save}
            </span>
            <input type="hidden" name="plan" value={PRICING.annual.lookupKey} />
            <h2 className="font-semibold text-lg">Annual</h2>
            <p className="mt-3 text-4xl font-semibold text-brand-dark [font-family:var(--font-display)]">
              {PRICING.annual.perMonth}
              <span className="text-sm font-normal text-muted"> /mo</span>
            </p>
            <p className="mt-2 text-sm text-muted flex-1">free for 14 days, then {PRICING.annual.perMonth}/mo · {PRICING.annual.sub}</p>
            <button type="submit" className="btn-primary w-full mt-5">
              Start free trial →
            </button>
          </form>
        </div>

        <div className="mx-auto mt-6 rounded-xl border border-brand bg-brand-tint/50 p-4 text-center text-sm">
          <span className="font-semibold text-brand-dark">
            Free 1-on-1 onboarding &amp; training included
          </span>{" "}
          — plus we feature your studio to our audience with branded Instagram
          posts.
        </div>

        <div className="mt-8 text-center text-sm text-muted space-y-2">
          <p>
            Secure checkout via Stripe · a flat 6% per sale covers card
            processing · this is just your tool subscription.
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
