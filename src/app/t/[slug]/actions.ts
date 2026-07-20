"use server";

import { redirect } from "next/navigation";
import {
  getTeacherBySlug,
  getSessionType,
  listAvailability,
  listBookings,
  createBooking,
} from "@/lib/repo";
import { computeSlots } from "@/lib/slots";
import { sendBookingEmails } from "@/lib/email";

// Create a booking from the public page. Payment is stubbed: we mark the booking
// paymentStatus "stubbed" and confirm it immediately. When Stripe Connect lands,
// this action instead creates a Checkout Session and the booking is confirmed by
// a webhook after payment succeeds.
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
  });

  // Fire confirmation emails (student + teacher). Never block the booking on
  // email delivery — a failure here shouldn't lose the booking.
  try {
    await sendBookingEmails({ booking, teacher: teacher!, sessionType: sessionType! });
  } catch (err) {
    console.error("[booking] email send failed", err);
  }

  redirect(`/t/${slug}/booked/${booking.id}`);
}
