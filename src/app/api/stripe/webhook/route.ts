import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import {
  getBookingByStripeSessionId,
  markBookingPaid,
  backfillStripeFee,
  deletePendingBooking,
  getTeacherById,
  getTeacherByStripeCustomerId,
  getSessionType,
  getPassByStripeSessionId,
  markPassPaid,
  backfillPassStripeFee,
  deletePendingPass,
  getOffer,
} from "@/lib/repo";
import { syncSubscriptionToTeacher } from "@/lib/billing";
import { sendBookingEmails, sendPassEmails } from "@/lib/email";

// Stripe's source of truth for payment state. Confirms bookings (and sends
// the confirmation emails) once Checkout actually succeeds, and frees the
// slot if a Checkout Session times out unpaid. Idempotent: markBookingPaid
// only transitions pending -> paid once, so replayed webhook deliveries are
// harmless, and this races safely against the confirmation page's own
// fallback verification — whichever runs first wins, the other is a no-op.
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("[stripe webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    // A one-time-payment session is either a booking or a pass purchase —
    // each confirm helper no-ops if the session isn't theirs.
    await confirmBookingForSession(session.id);
    await confirmPassForSession(session.id);
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const booking = await getBookingByStripeSessionId(session.id);
    if (booking) await deletePendingBooking(booking.id);
    const pass = await getPassByStripeSessionId(session.id);
    if (pass && pass.paymentStatus === "pending") await deletePendingPass(pass.id);
  }

  // Teacher subscription lifecycle: renewals, payment failures, cancellations.
  // Stripe's status string is mirrored verbatim onto the teacher row; the
  // dashboard gate reads it from there.
  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
    const teacher = await getTeacherByStripeCustomerId(customerId);
    if (teacher) {
      await syncSubscriptionToTeacher(teacher.id, subscription);
    }
  }

  return NextResponse.json({ received: true });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Stripe's actual processing fee for a completed Checkout Session, read from
// the underlying charge's balance transaction — the authoritative number
// (varies by card type/country), not a 2.9%+$0.30 estimate. Stripe sometimes
// hasn't finished attaching the balance transaction to the charge in the
// instant right after checkout completes (we can hit this via the
// confirmation page's fallback, which runs as fast as the browser redirects
// back), so retry briefly before giving up. Returns 0 if it truly can't be
// determined; that's a data-completeness gap, not a reason to block
// confirming the booking — confirmBookingForSession can top it up later.
async function fetchStripeFeeCents(stripeSessionId: string): Promise<number> {
  try {
    const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;
    if (!paymentIntentId) {
      console.warn("[stripe] no payment_intent on session", stripeSessionId);
      return 0;
    }

    for (const delayMs of [0, 1500, 3000]) {
      if (delayMs > 0) await sleep(delayMs);

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["latest_charge"],
      });
      const charge = paymentIntent.latest_charge;
      if (!charge || typeof charge === "string") continue;

      const balanceTransaction = charge.balance_transaction;
      if (!balanceTransaction) continue;

      // Often comes back as a plain ID rather than expanding through two
      // levels of nesting — fetch it directly rather than relying on that.
      if (typeof balanceTransaction === "string") {
        const txn = await stripe.balanceTransactions.retrieve(balanceTransaction);
        return txn.fee;
      }
      return balanceTransaction.fee;
    }

    console.warn("[stripe] balance_transaction never appeared for", paymentIntentId);
    return 0;
  } catch (err) {
    console.error("[stripe] failed to fetch processing fee", err);
    return 0;
  }
}

// Shared by the webhook and the confirmation page's fallback check.
export async function confirmBookingForSession(
  stripeSessionId: string,
): Promise<void> {
  const existing = await getBookingByStripeSessionId(stripeSessionId);
  if (!existing) return;

  if (existing.paymentStatus === "paid") {
    // Already confirmed by the other path. If the fee genuinely wasn't ready
    // yet when that happened, top it up now — a narrow, safe exception to
    // "only touch pending bookings".
    if (existing.stripeFeeCents === 0) {
      const feeCents = await fetchStripeFeeCents(stripeSessionId);
      if (feeCents > 0) await backfillStripeFee(existing.id, feeCents);
    }
    return;
  }
  if (existing.paymentStatus !== "pending") return;

  const stripeFeeCents = await fetchStripeFeeCents(stripeSessionId);
  const justPaid = await markBookingPaid(existing.id, stripeFeeCents);
  if (!justPaid) return; // already paid (other path won the race) or not found

  const [teacher, sessionType] = await Promise.all([
    getTeacherById(justPaid.teacherId),
    getSessionType(justPaid.sessionTypeId),
  ]);
  if (!teacher || !sessionType) return;

  try {
    await sendBookingEmails({ booking: justPaid, teacher, sessionType });
  } catch (err) {
    console.error("[booking] email send failed", err);
  }
}

// Pass-purchase twin of confirmBookingForSession — shared by the webhook and
// the pass success page's fallback check. Same idempotency contract.
export async function confirmPassForSession(
  stripeSessionId: string,
): Promise<void> {
  const existing = await getPassByStripeSessionId(stripeSessionId);
  if (!existing) return;

  if (existing.paymentStatus === "paid") {
    if (existing.stripeFeeCents === 0) {
      const feeCents = await fetchStripeFeeCents(stripeSessionId);
      if (feeCents > 0) await backfillPassStripeFee(existing.id, feeCents);
    }
    return;
  }

  const stripeFeeCents = await fetchStripeFeeCents(stripeSessionId);
  const justPaid = await markPassPaid(existing.id, stripeFeeCents);
  if (!justPaid) return;

  const [teacher, offer] = await Promise.all([
    getTeacherById(justPaid.teacherId),
    getOffer(justPaid.offerId),
  ]);
  if (!teacher || !offer) return;

  try {
    await sendPassEmails({ pass: justPaid, teacher, offer });
  } catch (err) {
    console.error("[pass] email send failed", err);
  }
}
