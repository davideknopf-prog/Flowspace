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
  findRedeemablePass,
  redeemPassCredit,
  getOffer,
  createPendingPass,
  attachPassStripeSession,
  deletePendingPass,
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

  // Auto-apply a pass: if this student (matched by email) holds a redeemable
  // pass with this teacher, consume a credit instead of charging them.
  let passId: string | null = null;
  if (!isFree) {
    const pass = await findRedeemablePass(teacher!.id, clientEmail);
    if (pass) {
      const redeemed = await redeemPassCredit(pass.id);
      if (redeemed) passId = pass.id;
      // If the redeem raced out (last credit just used), fall through to
      // normal payment.
    }
  }

  const paidByPass = passId !== null;

  const booking = await createBooking({
    teacherId: teacher!.id,
    sessionTypeId: sessionType!.id,
    clientName,
    clientEmail,
    note,
    startISO,
    durationMinutes: sessionType!.durationMinutes,
    priceCents: sessionType!.priceCents,
    // Snapshot delivery details so the student's link never changes under
    // them. Online sessions without their own link use the teacher's default
    // "virtual studio room" from their profile.
    locationType: sessionType!.locationType,
    meetingUrl:
      sessionType!.locationType === "online"
        ? sessionType!.meetingUrl || teacher!.defaultMeetingUrl
        : sessionType!.meetingUrl,
    locationNote: sessionType!.locationNote,
    paymentStatus: isFree ? "free" : paidByPass ? "pass" : "pending",
    stripeCheckoutSessionId: null,
    // Pass bookings carry no fees of their own — the pass purchase already did.
    platformFeeCents:
      isFree || paidByPass ? 0 : computePlatformFeeCents(sessionType!.priceCents),
    passId,
  });

  if (isFree || paidByPass) {
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

// Buy a multi-class pass from the public page. Same pending -> paid dance as
// bookings: the pass exists immediately but only becomes redeemable once
// Stripe confirms payment (webhook or success-page fallback).
export async function buyPassAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const offerId = String(formData.get("offerId") ?? "");
  const clientName = String(formData.get("clientName") ?? "").trim();
  const clientEmail = String(formData.get("clientEmail") ?? "")
    .trim()
    .toLowerCase();

  if (!clientName || !clientEmail.includes("@")) {
    redirect(`/t/${slug}?error=Enter+your+name+and+a+valid+email`);
  }

  const teacher = await getTeacherBySlug(slug);
  const offer = await getOffer(offerId);
  if (!teacher || !offer || offer.teacherId !== teacher.id || !offer.active) {
    redirect(`/t/${slug}?error=That+offer+is+no+longer+available`);
  }

  const pass = await createPendingPass(
    offer!,
    clientName,
    clientEmail,
    computePlatformFeeCents(offer!.priceCents),
  );

  const origin = await siteOrigin();
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `${offer!.name} with ${teacher!.name}` },
            unit_amount: offer!.priceCents,
          },
          quantity: 1,
        },
      ],
      customer_email: clientEmail,
      success_url: `${origin}/t/${slug}/pass-success/${pass.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/api/stripe/cancel?passId=${pass.id}&slug=${slug}`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      metadata: { passId: pass.id },
    });
  } catch (err) {
    console.error("[pass] stripe checkout session creation failed", err);
    await deletePendingPass(pass.id);
    redirect(`/t/${slug}?error=Payment+setup+failed.+Please+try+again.`);
  }

  await attachPassStripeSession(pass.id, session.id);
  redirect(session.url!);
}
