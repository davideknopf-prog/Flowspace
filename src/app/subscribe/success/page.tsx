import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/lib/session";
import { isSubscribed } from "@/lib/types";
import { stripe } from "@/lib/stripe";
import { syncSubscriptionToTeacher } from "@/lib/billing";

// Landing spot after Stripe subscription checkout. The webhook is the source
// of truth in steady state, but it can lag (or not be registered yet in a
// given environment), so verify directly with Stripe here — same
// belt-and-suspenders pattern as booking payments.
export default async function SubscribeSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  const { session_id } = await searchParams;

  if (!isSubscribed(teacher!) && session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ["subscription"],
      });
      const subscription = session.subscription;
      const sessionTeacherId = session.metadata?.teacherId;
      if (
        subscription &&
        typeof subscription !== "string" &&
        sessionTeacherId === teacher!.id
      ) {
        await syncSubscriptionToTeacher(teacher!.id, subscription);
        redirect("/dashboard?welcome=1");
      }
    } catch (err) {
      // redirect() throws internally by design — never swallow it.
      if (err && typeof err === "object" && "digest" in err) throw err;
      console.error("[subscribe] verification failed", err);
    }
  }

  if (isSubscribed(teacher!)) redirect("/dashboard?welcome=1");

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-accent text-white text-3xl">
          …
        </div>
        <h1 className="text-2xl font-semibold mb-2">Confirming your subscription…</h1>
        <p className="text-muted mb-6">
          This can take a few seconds. Refresh this page and you&apos;ll be
          dropped into your dashboard as soon as it clears.
        </p>
        <Link
          href={
            session_id
              ? `/subscribe/success?session_id=${encodeURIComponent(session_id)}`
              : "/subscribe/success"
          }
          className="btn-primary"
        >
          Refresh
        </Link>
      </div>
    </main>
  );
}
