"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  getTeacherBySlug,
  getSessionType,
  listAvailability,
  listBookings,
  createBooking,
  attachStripeSession,
  computePlatformFeeCents,
  deletePendingBooking,
} from "@/lib/repo";
import { computeSlots } from "@/lib/slots";
import { sendBookingEmails } from "@/lib/email";
import { stripe } from "@/lib/stripe";

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

// Create a booking from the public page.
// - Free sessions confirm instantly and email right away (unchanged behavior).
// - Paid sessions create a "pending" booking (this holds the slot) and send
//   the student to Stripe Checkout. The booking only becomes real once
//   markBookingPaid() runs — from the webhook, or the confirmation page's
//   fallback verification — which is also what triggers the emails.
export async function bookAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const sessionTypeId = String(formData.get("sessionTypeId") ?? "");
  const startISO = String(formData.get("startISO") ?? "");
  const clientName = String(formData.get("clientName") ?? "").trim();
  const clientEmail = String(formData.get("clientEmail") ?? "")
    .trim()
    .toLowerCase();
  const note = String(formData.get("note") ?? "").trim();

  const base = `/t/${slug}/book/${sessionTypeId}`;

  if (!clientName || !clientEmail.includes("@")) {
    redirect(`${base}?error=Enter+your+name+and+a+valid+email&start=${encodeURIComponent(startISO)}`);
  }

  const teacher = await getTeacherBySlug(slug);
  const sessionType = await getSessionType(sessionTypeId);
  if (!teacher || !sessionType || sessionType.teacherId !== teacher.id) {
    redirect(`/t/${slug}?error=That+session+is+no+longer+available`);
  }

  // Re-validate the chosen slot is still genuinely bookable (guards against a
  // slot being taken between page load and submit).
  const [rules, bookings] = await Promise.all([
    listAvailability(teacher!.id),
    listBookings(teacher!.id),
  ]);
  const slots = computeSlots({
    now: new Date(),
    timeZone: teacher!.timezone,
    durationMinutes: sessionType!.durationMinutes,
    rules,
    bookings,
  });
  const stillOpen = slots.some((s) => s.startISO === startISO);
  if (!startISO || !stillOpen) {
    redirect(`${base}?error=That+time+was+just+taken.+Pick+another.`);
  }

  const isFree = sessionType!.priceCents === 0;

  const booking = await createBooking({
    teacherId: teacher!.id,
    sessionTypeId: sessionType!.id,
    clientName,
    clientEmail,
    note,
    startISO,
    durationMinutes: sessionType!.durationMinutes,
    priceCents: sessionType!.priceCents,
    // Snapshot delivery details so the student's link never changes under them.
    locationType: sessionType!.locationType,
    meetingUrl: sessionType!.meetingUrl,
    locationNote: sessionType!.locationNote,
    paymentStatus: isFree ? "free" : "pending",
    stripeCheckoutSessionId: null,
    platformFeeCents: isFree ? 0 : computePlatformFeeCents(sessionType!.priceCents),
  });

  if (isFree) {
    try {
      await sendBookingEmails({ booking, teacher: teacher!, sessionType: sessionType! });
    } catch (err) {
      console.error("[booking] email send failed", err);
    }
    redirect(`/t/${slug}/booked/${booking.id}`);
  }

  const origin = await siteOrigin();

  // If Checkout Session creation itself fails (bad key, Stripe outage, etc.),
  // the pending booking we just made would otherwise be orphaned forever —
  // no Stripe session ever exists to reconcile it, so nothing would ever
  // free that held slot. Delete it and surface a real error instead.
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `${sessionType!.name} with ${teacher!.name}` },
            unit_amount: sessionType!.priceCents,
          },
          quantity: 1,
        },
      ],
      customer_email: clientEmail,
      success_url: `${origin}/t/${slug}/booked/${booking.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/api/stripe/cancel?bookingId=${booking.id}&slug=${slug}&sessionTypeId=${sessionTypeId}`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min, Stripe's minimum
      metadata: { bookingId: booking.id },
    });
  } catch (err) {
    console.error("[booking] stripe checkout session creation failed", err);
    await deletePendingBooking(booking.id);
    redirect(`${base}?error=Payment+setup+failed.+Please+try+again.`);
  }

  await attachStripeSession(booking.id, session.id);
  redirect(session.url!);
}
