import type { Booking, Teacher, SessionType } from "./types";
import { formatSlot, formatPrice, formatDuration } from "./format";

// -----------------------------------------------------------------------------
// Transactional email via Resend's REST API (no SDK dependency).
//
// If RESEND_API_KEY is not set we DON'T send — we log the message and return
// { sent: false }. That keeps local/demo runs working with zero setup while the
// exact same code path goes live the moment a key is added to the environment.
//
// To go live:
//   1. Create a Resend account, verify your sending domain.
//   2. Set RESEND_API_KEY and EMAIL_FROM (e.g. "Flowspace <hello@yourdomain>").
// Until a domain is verified, Resend only delivers to the account owner from
// "onboarding@resend.dev".
// -----------------------------------------------------------------------------

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

async function send({
  to,
  subject,
  html,
  text,
  replyTo,
}: SendArgs): Promise<{ sent: boolean }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Flowspace <onboarding@resend.dev>";

  if (!key) {
    console.log(
      `[email:stub] would send to ${to} — "${subject}"\n${text}\n(set RESEND_API_KEY to actually send)`,
    );
    return { sent: false };
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }
  return { sent: true };
}

// Human-readable "where" line for a booking, shared by both emails + reused copy.
function locationBlock(b: Booking): { label: string; value: string; link?: string } {
  if (b.locationType === "in_person") {
    return {
      label: "Location",
      value: b.locationNote || "Address to be shared by your teacher.",
    };
  }
  return {
    label: "Join link",
    value: b.meetingUrl || "Your teacher will share the link before the session.",
    link: b.meetingUrl || undefined,
  };
}

function wrapHtml(inner: string): string {
  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;color:#26211c">
    <div style="font-size:20px;font-weight:600;color:#47645a;margin-bottom:16px">🧘 Flowspace</div>
    ${inner}
    <p style="color:#7c736a;font-size:12px;margin-top:24px">Powered by Flowspace</p>
  </div>`;
}

export async function sendBookingEmails({
  booking,
  teacher,
  sessionType,
}: {
  booking: Booking;
  teacher: Teacher;
  sessionType: SessionType;
}): Promise<void> {
  const when = formatSlot(booking.startISO, teacher.timezone);
  const loc = locationBlock(booking);
  const price = formatPrice(booking.priceCents);
  const duration = formatDuration(booking.durationMinutes);
  const locValueHtml = loc.link
    ? `<a href="${loc.link}" style="color:#47645a">${loc.link}</a>`
    : loc.value;

  // --- To the student -------------------------------------------------------
  const studentText = [
    `You're booked with ${teacher.name}!`,
    ``,
    `Session: ${sessionType.name}`,
    `When: ${when} (${teacher.timezone})`,
    `Duration: ${duration}`,
    `Price: ${price}`,
    `${loc.label}: ${loc.value}`,
    ``,
    `See you on the mat.`,
  ].join("\n");

  const studentHtml = wrapHtml(`
    <h1 style="font-size:18px">You're booked with ${teacher.name}! ✓</h1>
    <table style="font-size:14px;line-height:1.9;border-collapse:collapse">
      <tr><td style="color:#7c736a;padding-right:16px">Session</td><td>${sessionType.name}</td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">When</td><td>${when}<br><span style="color:#7c736a;font-size:12px">${teacher.timezone}</span></td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">Duration</td><td>${duration}</td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">Price</td><td>${price}</td></tr>
      <tr><td style="color:#7c736a;padding-right:16px;vertical-align:top">${loc.label}</td><td>${locValueHtml}</td></tr>
    </table>`);

  // --- To the teacher -------------------------------------------------------
  const teacherText = [
    `New booking from ${booking.clientName} (${booking.clientEmail}).`,
    ``,
    `Session: ${sessionType.name}`,
    `When: ${when} (${teacher.timezone})`,
    `Price: ${price}`,
    booking.note ? `Note: ${booking.note}` : ``,
  ]
    .filter(Boolean)
    .join("\n");

  const teacherHtml = wrapHtml(`
    <h1 style="font-size:18px">New booking 🎉</h1>
    <table style="font-size:14px;line-height:1.9;border-collapse:collapse">
      <tr><td style="color:#7c736a;padding-right:16px">Student</td><td>${booking.clientName} &lt;${booking.clientEmail}&gt;</td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">Session</td><td>${sessionType.name}</td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">When</td><td>${when}</td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">Price</td><td>${price}</td></tr>
      ${booking.note ? `<tr><td style="color:#7c736a;padding-right:16px;vertical-align:top">Note</td><td>${booking.note}</td></tr>` : ""}
    </table>`);

  // allSettled, not all: the two emails are independent, and a bad address on
  // one side (e.g. a test account's fake domain) must never look like it also
  // swallowed or blocked the other, genuinely important one.
  const results = await Promise.allSettled([
    send({
      to: booking.clientEmail,
      subject: `Booking confirmed: ${sessionType.name} with ${teacher.name}`,
      html: studentHtml,
      text: studentText,
      replyTo: teacher.email,
    }),
    send({
      to: teacher.email,
      subject: `New booking: ${booking.clientName} — ${sessionType.name}`,
      html: teacherHtml,
      text: teacherText,
      replyTo: booking.clientEmail,
    }),
  ]);

  const [studentResult, teacherResult] = results;
  if (studentResult.status === "rejected") {
    console.error("[email] student confirmation failed", studentResult.reason);
  }
  if (teacherResult.status === "rejected") {
    console.error("[email] teacher notification failed", teacherResult.reason);
  }
}
