import type {
  Booking,
  Teacher,
  SessionType,
  Pass,
  Offer,
  PayoutRequest,
} from "./types";
import { payoutMethodLabel } from "./types";
import { formatSlot, formatPrice, formatDuration, formatMoney } from "./format";
import { FOUNDER } from "./founder";

// -----------------------------------------------------------------------------
// Transactional email via Resend's REST API (no SDK dependency).
//
// If RESEND_API_KEY is not set we DON'T send — we log the message and return
// { sent: false }. That keeps local/demo runs working with zero setup while the
// exact same code path goes live the moment a key is added to the environment.
//
// To go live:
//   1. Create a Resend account, verify your sending domain.
//   2. Set RESEND_API_KEY and EMAIL_FROM (e.g. "Kuleo <hello@yourdomain>").
// Until a domain is verified, Resend only delivers to the account owner from
// "onboarding@resend.dev".
// -----------------------------------------------------------------------------

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

// Escape user-controlled text before it goes into email HTML. Names, notes,
// payout handles, etc. are free-form: without this a crafted value could inject
// markup — and the founder's cash-out email is the payment-instruction channel,
// so a spoofed amount/destination there is a real risk, not just cosmetic.
function esc(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
  const from = process.env.EMAIL_FROM || "Kuleo <onboarding@resend.dev>";

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
    <div style="font-size:20px;font-weight:600;color:#47645a;margin-bottom:16px">🧘 Kuleo</div>
    ${inner}
    <p style="color:#7c736a;font-size:12px;margin-top:24px">Powered by Kuleo</p>
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
    ? `<a href="${esc(loc.link)}" style="color:#47645a">${esc(loc.link)}</a>`
    : esc(loc.value);

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
    <h1 style="font-size:18px">You're booked with ${esc(teacher.name)}! ✓</h1>
    <table style="font-size:14px;line-height:1.9;border-collapse:collapse">
      <tr><td style="color:#7c736a;padding-right:16px">Session</td><td>${esc(sessionType.name)}</td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">When</td><td>${when}<br><span style="color:#7c736a;font-size:12px">${esc(teacher.timezone)}</span></td></tr>
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
      <tr><td style="color:#7c736a;padding-right:16px">Student</td><td>${esc(booking.clientName)} &lt;${esc(booking.clientEmail)}&gt;</td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">Session</td><td>${esc(sessionType.name)}</td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">When</td><td>${when}</td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">Price</td><td>${price}</td></tr>
      ${booking.note ? `<tr><td style="color:#7c736a;padding-right:16px;vertical-align:top">Note</td><td>${esc(booking.note)}</td></tr>` : ""}
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

export async function sendPassEmails({
  pass,
  teacher,
  offer,
}: {
  pass: Pass;
  teacher: Teacher;
  offer: Offer;
}): Promise<void> {
  const price = formatPrice(pass.priceCents);
  const credits =
    pass.creditsTotal == null ? "Unlimited classes" : `${pass.creditsTotal} classes`;
  const expiry = pass.expiresAt
    ? `Valid until ${new Date(pass.expiresAt).toLocaleDateString()}`
    : "No expiration";

  const studentText = [
    `You bought ${offer.name} with ${teacher.name}!`,
    ``,
    `Includes: ${credits}`,
    `${expiry}`,
    `Price: ${price}`,
    ``,
    `To use it: book any class on ${teacher.name.split(" ")[0]}'s page with this same email (${pass.clientEmail}) and your pass is applied automatically — no code needed.`,
  ].join("\n");

  const studentHtml = wrapHtml(`
    <h1 style="font-size:18px">Your pass is active! ✓</h1>
    <table style="font-size:14px;line-height:1.9;border-collapse:collapse">
      <tr><td style="color:#7c736a;padding-right:16px">Pass</td><td>${esc(offer.name)} with ${esc(teacher.name)}</td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">Includes</td><td>${credits}</td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">Validity</td><td>${expiry}</td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">Price</td><td>${price}</td></tr>
    </table>
    <p style="font-size:13px;color:#7c736a;margin-top:16px">To use it, book any class with this same email (${esc(pass.clientEmail)}) — your pass is applied automatically.</p>`);

  const teacherText = [
    `${pass.clientName} (${pass.clientEmail}) bought your ${offer.name} for ${price}.`,
    `Includes: ${credits} · ${expiry}`,
  ].join("\n");

  const teacherHtml = wrapHtml(`
    <h1 style="font-size:18px">Pass sold! 🎉</h1>
    <table style="font-size:14px;line-height:1.9;border-collapse:collapse">
      <tr><td style="color:#7c736a;padding-right:16px">Student</td><td>${esc(pass.clientName)} &lt;${esc(pass.clientEmail)}&gt;</td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">Pass</td><td>${esc(offer.name)}</td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">Price</td><td>${price}</td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">Includes</td><td>${credits} · ${expiry}</td></tr>
    </table>`);

  const results = await Promise.allSettled([
    send({
      to: pass.clientEmail,
      subject: `Pass confirmed: ${offer.name} with ${teacher.name}`,
      html: studentHtml,
      text: studentText,
      replyTo: teacher.email,
    }),
    send({
      to: teacher.email,
      subject: `Pass sold: ${pass.clientName} — ${offer.name}`,
      html: teacherHtml,
      text: teacherText,
      replyTo: pass.clientEmail,
    }),
  ]);
  for (const r of results) {
    if (r.status === "rejected") console.error("[email] pass email failed", r.reason);
  }
}

// --- Cash-out flow -----------------------------------------------------------

// To the founder: a teacher hit "Cash out". Everything needed to pay them is
// in the email — send the money on the P2P app, then mark it paid in Operator
// tools so the payout is recorded and the teacher gets the good-news email.
export async function sendCashOutRequestedEmail({
  teacher,
  request,
}: {
  teacher: Teacher;
  request: PayoutRequest;
}): Promise<void> {
  const amount = formatMoney(request.amountCents);
  const method = payoutMethodLabel(request.method);

  const text = [
    `${teacher.name} requested a cash-out of ${amount}.`,
    ``,
    `Send it via ${method} to: ${request.handle}`,
    ``,
    `Then mark it paid in Operator tools on your dashboard`,
    `(https://kuleo.io/dashboard) — that records the payout and`,
    `emails ${teacher.name.split(" ")[0]} the good news.`,
  ].join("\n");

  const html = wrapHtml(`
    <h1 style="font-size:18px">💸 Cash-out request: ${amount}</h1>
    <table style="font-size:14px;line-height:1.9;border-collapse:collapse">
      <tr><td style="color:#7c736a;padding-right:16px">Teacher</td><td>${esc(teacher.name)} &lt;${esc(teacher.email)}&gt;</td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">Amount</td><td style="font-weight:600">${amount}</td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">Send via</td><td>${method}</td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">To</td><td style="font-weight:600">${esc(request.handle)}</td></tr>
    </table>
    <p style="font-size:13px;margin-top:16px">
      After you send it, <a href="https://kuleo.io/dashboard" style="color:#47645a">mark it paid in Operator tools</a>
      — that records the payout and emails ${esc(teacher.name.split(" ")[0])} the good news.
    </p>`);

  try {
    await send({
      to: FOUNDER.email,
      subject: `💸 Cash-out request: ${amount} — ${teacher.name}`,
      html,
      text,
      replyTo: teacher.email,
    });
  } catch (err) {
    // The request row is already saved (it shows in Operator tools), so a mail
    // hiccup should never surface as a failed cash-out to the teacher.
    console.error("[email] cash-out request notification failed", err);
  }
}

// To the teacher: their money is on the way. This is the moment the product
// is selling — keep it celebratory.
export async function sendCashOutPaidEmail({
  teacher,
  request,
}: {
  teacher: Teacher;
  request: PayoutRequest;
}): Promise<void> {
  const amount = formatMoney(request.amountCents);
  const method = payoutMethodLabel(request.method);

  const text = [
    `${amount} is on its way to you! 🎉`,
    ``,
    `We sent your cash-out via ${method} to ${request.handle}.`,
    `It should show up within 1–2 business days (often much sooner).`,
    ``,
    `Keep teaching — your earnings page always shows your live balance.`,
  ].join("\n");

  const html = wrapHtml(`
    <h1 style="font-size:18px">💸 ${amount} is on its way! 🎉</h1>
    <p style="font-size:14px;line-height:1.7">
      We sent your cash-out via <strong>${method}</strong> to
      <strong>${esc(request.handle)}</strong>. It should show up within 1–2 business
      days — often much sooner.
    </p>
    <p style="font-size:13px;color:#7c736a">
      Keep teaching — <a href="https://kuleo.io/dashboard/earnings" style="color:#47645a">your earnings page</a>
      always shows your live balance.
    </p>`);

  try {
    await send({
      to: teacher.email,
      subject: `💸 ${amount} is on its way to you!`,
      html,
      text,
      replyTo: FOUNDER.email,
    });
  } catch (err) {
    console.error("[email] cash-out paid notification failed", err);
  }
}
