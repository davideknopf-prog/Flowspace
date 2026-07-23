import type {
  Booking,
  Teacher,
  SessionType,
  Pass,
  Offer,
  PayoutRequest,
  Quote,
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
  attachments?: { filename: string; content: string }[]; // content = base64
}

async function send({
  to,
  subject,
  html,
  text,
  replyTo,
  attachments,
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
      ...(attachments && attachments.length > 0 ? { attachments } : {}),
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

// "Add to calendar": a Google Calendar link + a universal .ics attachment.
function calendarBits(booking: Booking, teacher: Teacher, sessionName: string) {
  if (!booking.startISO) return null;
  const start = new Date(booking.startISO);
  const end = new Date(start.getTime() + booking.durationMinutes * 60_000);
  const stamp = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const title = `${sessionName} with ${teacher.name}`;
  const details = booking.meetingUrl
    ? `Join link: ${booking.meetingUrl}`
    : booking.locationNote || "";
  const gcal =
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${stamp(start)}/${stamp(end)}` +
    `&details=${encodeURIComponent(details)}` +
    (booking.locationType === "in_person" && booking.locationNote
      ? `&location=${encodeURIComponent(booking.locationNote)}`
      : "");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kuleo//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${booking.id}@kuleo.io`,
    `DTSTAMP:${stamp(new Date(booking.createdAt))}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${title.replace(/[,;]/g, " ")}`,
    details ? `DESCRIPTION:${details.replace(/[,;]/g, " ")}` : "",
    booking.locationType === "in_person" && booking.locationNote
      ? `LOCATION:${booking.locationNote.replace(/[,;]/g, " ")}`
      : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
  return {
    gcal,
    attachment: {
      filename: "class.ics",
      content: Buffer.from(ics, "utf8").toString("base64"),
    },
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
  const contactBits = [teacher.contactPhone, teacher.contactEmail]
    .filter(Boolean)
    .join(" · ");
  const when = booking.startISO
    ? formatSlot(booking.startISO, teacher.timezone)
    : `To be scheduled together${contactBits ? ` — reach ${teacher.name.split(" ")[0]}: ${contactBits}` : ` — ${teacher.name.split(" ")[0]} will reach out`}`;
  const loc = locationBlock(booking);
  const price = formatPrice(booking.priceCents);
  const duration = formatDuration(booking.durationMinutes);
  const locValueHtml = loc.link
    ? `<a href="${esc(loc.link)}" style="color:#47645a">${esc(loc.link)}</a>`
    : esc(loc.value);

  // Teacher's welcome note: per-class first, teacher default second.
  const welcome = (sessionType.confirmationNote || teacher.confirmationNote).trim();
  const cal = calendarBits(booking, teacher, sessionType.name);

  // --- To the student -------------------------------------------------------
  const studentText = [
    `You're booked with ${teacher.name}!`,
    ``,
    `Session: ${sessionType.name}`,
    `When: ${when} (${teacher.timezone})`,
    `Duration: ${duration}`,
    `Price: ${price}`,
    `${loc.label}: ${loc.value}`,
    cal ? `Add to calendar: ${cal.gcal}` : ``,
    welcome ? `` : ``,
    welcome ? `A note from ${teacher.name.split(" ")[0]}: ${welcome}` : ``,
    ``,
    `See you on the mat.`,
  ]
    .filter((l, i, a) => l !== `` || (a[i - 1] !== `` && i !== a.length - 1))
    .join("\n");

  const studentHtml = wrapHtml(`
    <h1 style="font-size:18px">You're booked with ${esc(teacher.name)}! ✓</h1>
    <table style="font-size:14px;line-height:1.9;border-collapse:collapse">
      <tr><td style="color:#7c736a;padding-right:16px">Session</td><td>${esc(sessionType.name)}</td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">When</td><td>${when}<br><span style="color:#7c736a;font-size:12px">${esc(teacher.timezone)}</span></td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">Duration</td><td>${duration}</td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">Price</td><td>${price}</td></tr>
      <tr><td style="color:#7c736a;padding-right:16px;vertical-align:top">${loc.label}</td><td>${locValueHtml}</td></tr>
    </table>
    ${cal ? `<p style="margin-top:16px"><a href="${cal.gcal}" style="display:inline-block;background:#5b7c6f;color:#ffffff;text-decoration:none;padding:9px 16px;border-radius:8px;font-size:14px">📅 Add to calendar</a> <span style="color:#7c736a;font-size:12px">(or open the attached class.ics)</span></p>` : ""}
    ${welcome ? `<div style="margin-top:16px;padding:12px 14px;background:#edf2ef;border-radius:10px;font-size:14px"><span style="color:#47645a;font-weight:600">A note from ${esc(teacher.name.split(" ")[0])}:</span><br>${esc(welcome)}</div>` : ""}`);

  // --- To the teacher: lead with the money, not the logistics --------------
  // The dopamine hit is the point. A paid booking celebrates the earnings; a
  // pass-redeemed booking already earned its money at pass-purchase time, and
  // a free booking earns nothing now — each gets honest framing.
  const noteRow = booking.note
    ? `<tr><td style="color:#7c736a;padding-right:16px;vertical-align:top">Note</td><td>${esc(booking.note)}</td></tr>`
    : "";
  const net = formatMoney(booking.priceCents - booking.platformFeeCents);
  const earningsCta = `<p style="margin-top:18px"><a href="https://kuleo.io/dashboard/earnings" style="background:#4a7c59;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:600;font-size:14px;display:inline-block">See your earnings →</a></p>`;

  let teacherSubject: string;
  let teacherText: string;
  let teacherHtml: string;

  if (booking.paymentStatus === "paid") {
    teacherSubject = `💰 You just earned ${net}! ${booking.clientName} booked ${sessionType.name}`;
    teacherText = [
      `Ka-ching! You just earned ${net}. 💰`,
      ``,
      `${booking.clientName} (${booking.clientEmail}) booked ${sessionType.name}.`,
      `When: ${when} (${teacher.timezone})`,
      `They paid ${price}; after the flat 6% processing fee, ${net} was added to your Kuleo balance — cash out anytime.`,
      booking.note ? `Note: ${booking.note}` : ``,
    ]
      .filter(Boolean)
      .join("\n");
    teacherHtml = wrapHtml(`
      <p style="font-size:15px;color:#4a4b47;margin:0 0 2px">You just earned</p>
      <p style="font-size:34px;font-weight:700;color:#4a7c59;margin:0 0 10px">${net} 💰</p>
      <p style="font-size:14px;color:#26211c;margin:0 0 16px"><strong>${esc(booking.clientName)}</strong> booked <strong>${esc(sessionType.name)}</strong>. It&apos;s been added to your Kuleo balance — cash out anytime.</p>
      <table style="font-size:14px;line-height:1.9;border-collapse:collapse">
        <tr><td style="color:#7c736a;padding-right:16px">Student</td><td>${esc(booking.clientName)} &lt;${esc(booking.clientEmail)}&gt;</td></tr>
        <tr><td style="color:#7c736a;padding-right:16px">Session</td><td>${esc(sessionType.name)}</td></tr>
        <tr><td style="color:#7c736a;padding-right:16px">When</td><td>${when}</td></tr>
        <tr><td style="color:#7c736a;padding-right:16px">They paid</td><td>${price} <span style="color:#7c736a;font-size:12px">— you keep ${net} after the 6% fee</span></td></tr>
        ${noteRow}
      </table>
      ${earningsCta}`);
  } else if (booking.paymentStatus === "pass") {
    teacherSubject = `🎟 ${booking.clientName} used a pass — ${sessionType.name}`;
    teacherText = [
      `${booking.clientName} (${booking.clientEmail}) booked ${sessionType.name} using a class pass.`,
      `When: ${when} (${teacher.timezone})`,
      `You already earned this when they bought the pass — no new charge.`,
      booking.note ? `Note: ${booking.note}` : ``,
    ]
      .filter(Boolean)
      .join("\n");
    teacherHtml = wrapHtml(`
      <h1 style="font-size:18px">Class booked with a pass 🎟</h1>
      <p style="font-size:14px;color:#26211c;margin:0 0 16px"><strong>${esc(booking.clientName)}</strong> redeemed a pass credit for <strong>${esc(sessionType.name)}</strong>. You earned this money when they bought the pass.</p>
      <table style="font-size:14px;line-height:1.9;border-collapse:collapse">
        <tr><td style="color:#7c736a;padding-right:16px">Student</td><td>${esc(booking.clientName)} &lt;${esc(booking.clientEmail)}&gt;</td></tr>
        <tr><td style="color:#7c736a;padding-right:16px">Session</td><td>${esc(sessionType.name)}</td></tr>
        <tr><td style="color:#7c736a;padding-right:16px">When</td><td>${when}</td></tr>
        ${noteRow}
      </table>`);
  } else {
    teacherSubject = `New booking: ${booking.clientName} — ${sessionType.name}`;
    teacherText = [
      `New booking from ${booking.clientName} (${booking.clientEmail}).`,
      `Session: ${sessionType.name}`,
      `When: ${when} (${teacher.timezone})`,
      `This class is free — no charge.`,
      booking.note ? `Note: ${booking.note}` : ``,
    ]
      .filter(Boolean)
      .join("\n");
    teacherHtml = wrapHtml(`
      <h1 style="font-size:18px">New booking 🎉</h1>
      <table style="font-size:14px;line-height:1.9;border-collapse:collapse">
        <tr><td style="color:#7c736a;padding-right:16px">Student</td><td>${esc(booking.clientName)} &lt;${esc(booking.clientEmail)}&gt;</td></tr>
        <tr><td style="color:#7c736a;padding-right:16px">Session</td><td>${esc(sessionType.name)}</td></tr>
        <tr><td style="color:#7c736a;padding-right:16px">When</td><td>${when}</td></tr>
        <tr><td style="color:#7c736a;padding-right:16px">Price</td><td>Free</td></tr>
        ${noteRow}
      </table>`);
  }

  // allSettled, not all: the two emails are independent, and a bad address on
  // one side (e.g. a test account's fake domain) must never look like it also
  // swallowed or blocked the other, genuinely important one.
  const results = await Promise.allSettled([
    send({
      to: booking.clientEmail,
      subject: `Booking confirmed: ${sessionType.name} with ${teacher.name}`,
      html: studentHtml,
      text: studentText,
      replyTo: teacher.contactEmail || teacher.email,
      attachments: cal ? [cal.attachment] : undefined,
    }),
    send({
      to: teacher.email,
      subject: teacherSubject,
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

  const passNet = formatMoney(pass.priceCents - pass.platformFeeCents);
  const teacherText = [
    `Cha-ching! You just earned ${passNet}. 💰`,
    ``,
    `${pass.clientName} (${pass.clientEmail}) bought your ${offer.name} (${credits}) for ${price}.`,
    `After the flat 6% processing fee, ${passNet} was added to your Kuleo balance — cash out anytime.`,
    `Passes are the studio move: recurring money, paid up front.`,
  ].join("\n");

  const teacherHtml = wrapHtml(`
    <p style="font-size:15px;color:#4a4b47;margin:0 0 2px">You just earned</p>
    <p style="font-size:34px;font-weight:700;color:#4a7c59;margin:0 0 10px">${passNet} 💰</p>
    <p style="font-size:14px;color:#26211c;margin:0 0 16px"><strong>${esc(pass.clientName)}</strong> bought your <strong>${esc(offer.name)}</strong> (${credits}). It&apos;s in your Kuleo balance — cash out anytime. Passes are the studio move: recurring money, paid up front.</p>
    <table style="font-size:14px;line-height:1.9;border-collapse:collapse">
      <tr><td style="color:#7c736a;padding-right:16px">Student</td><td>${esc(pass.clientName)} &lt;${esc(pass.clientEmail)}&gt;</td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">Pass</td><td>${esc(offer.name)}</td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">They paid</td><td>${price} <span style="color:#7c736a;font-size:12px">— you keep ${passNet} after the 6% fee</span></td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">Includes</td><td>${credits} · ${expiry}</td></tr>
    </table>
    <p style="margin-top:18px"><a href="https://kuleo.io/dashboard/earnings" style="background:#4a7c59;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:600;font-size:14px;display:inline-block">See your earnings →</a></p>`);

  const results = await Promise.allSettled([
    send({
      to: pass.clientEmail,
      subject: `Pass confirmed: ${offer.name} with ${teacher.name}`,
      html: studentHtml,
      text: studentText,
      replyTo: teacher.contactEmail || teacher.email,
    }),
    send({
      to: teacher.email,
      subject: `💰 You just earned ${passNet}! ${pass.clientName} bought ${offer.name}`,
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


// --- Post-class follow-up ----------------------------------------------------
// One email per attended booking, in the teacher's voice: review ask,
// upcoming classes, and the pass/coaching upsell. Sent by the daily cron.

export interface FollowupUpcoming {
  label: string; // "Thu Jul 30 · 6:00 PM — Vinyasa Flow"
  url: string;
}

export async function sendFollowupEmail({
  booking,
  teacher,
  sessionType,
  reviewUrl,
  upcoming,
  offers,
  flexibleSessions,
  siteOrigin,
}: {
  booking: Booking;
  teacher: Teacher;
  sessionType: SessionType;
  reviewUrl: string;
  upcoming: FollowupUpcoming[];
  offers: Offer[];
  flexibleSessions: SessionType[];
  siteOrigin: string;
}): Promise<void> {
  const first = teacher.name.split(" ")[0];
  const ps = teacher.followupNote.trim();
  const pageUrl = `${siteOrigin}/t/${teacher.slug}`;

  const upsellLines = [
    ...offers.map(
      (o) =>
        `${o.name} — ${formatPrice(o.priceCents)}${o.creditCount != null ? ` (${o.creditCount} classes)` : ""}`,
    ),
    ...flexibleSessions.map(
      (f) => `${f.name} — ${formatPrice(f.priceCents)} (flexible scheduling)`,
    ),
  ];

  const text = [
    `Hi ${booking.clientName.split(" ")[0]},`,
    ``,
    `Thanks so much for joining ${sessionType.name} — I hope it felt great.`,
    ``,
    `If you have 30 seconds, a quick review would mean the world: ${reviewUrl}`,
    upcoming.length > 0 ? `` : ``,
    upcoming.length > 0 ? `Coming up this week:` : ``,
    ...upcoming.map((u) => `- ${u.label}: ${u.url}`),
    upsellLines.length > 0 ? `` : ``,
    upsellLines.length > 0
      ? `Planning to practice more? These save you money:`
      : ``,
    ...upsellLines.map((l) => `- ${l} — ${pageUrl}`),
    ps ? `` : ``,
    ps ? `P.S. ${ps}` : ``,
    ``,
    `— ${first}`,
  ]
    .filter((l, i, a) => l !== `` || a[i - 1] !== ``)
    .join(`\n`);

  const html = wrapHtml(`
    <h1 style="font-size:18px">Thanks for practicing with ${esc(first)} 🧘</h1>
    <p style="font-size:14px;line-height:1.7">Hi ${esc(booking.clientName.split(" ")[0])},<br>
    Thanks so much for joining <strong>${esc(sessionType.name)}</strong> — I hope it felt great.</p>
    <p style="margin:18px 0"><a href="${esc(reviewUrl)}" style="display:inline-block;background:#5b7c6f;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px">⭐ Leave a quick review</a></p>
    ${
      upcoming.length > 0
        ? `<p style="font-size:14px;font-weight:600;margin-bottom:6px">Coming up this week</p>
           <table style="font-size:14px;line-height:1.9;border-collapse:collapse">` +
          upcoming
            .map(
              (u) =>
                `<tr><td>${esc(u.label)}</td><td style="padding-left:12px"><a href="${esc(u.url)}" style="color:#47645a">Book →</a></td></tr>`,
            )
            .join("") +
          `</table>`
        : ""
    }
    ${
      upsellLines.length > 0
        ? `<div style="margin-top:18px;padding:12px 14px;background:#edf2ef;border-radius:10px;font-size:14px">
             <p style="font-weight:600;margin:0 0 6px">Planning to practice more?</p>
             ${upsellLines.map((l) => `<p style="margin:2px 0">${esc(l)}</p>`).join("")}
             <p style="margin:8px 0 0"><a href="${esc(pageUrl)}" style="color:#47645a;font-weight:600">See passes &amp; offerings →</a></p>
           </div>`
        : ""
    }
    ${ps ? `<p style="font-size:14px;line-height:1.7;margin-top:16px"><em>P.S. ${esc(ps)}</em></p>` : ""}
    <p style="font-size:14px;margin-top:16px">— ${esc(first)}</p>`);

  await send({
    to: booking.clientEmail,
    subject: `Thanks for joining ${sessionType.name}! 🙏`,
    html,
    text,
    replyTo: teacher.contactEmail || teacher.email,
  });
}


// --- Custom quotes -----------------------------------------------------------

// Sent to the client when a teacher issues a quote with a client email — a
// clean, payable summary.
export async function sendQuoteCreatedEmail({
  quote,
  teacher,
  payUrl,
}: {
  quote: Quote;
  teacher: Teacher;
  payUrl: string;
}): Promise<void> {
  const first = teacher.name.split(" ")[0];
  const price = formatPrice(quote.priceCents);
  const text = [
    `${teacher.name} sent you a quote via Kuleo.`,
    ``,
    `${quote.title} — ${price}`,
    quote.description ? `` : ``,
    quote.description ? quote.description : ``,
    ``,
    `Pay securely here: ${payUrl}`,
    ``,
    `— ${first}`,
  ].filter((l, i, a) => l !== `` || a[i - 1] !== ``).join("\n");

  const html = wrapHtml(`
    <h1 style="font-size:18px">${esc(teacher.name)} sent you a quote</h1>
    <div style="margin:14px 0;padding:14px;border:1px solid #ece7e0;border-radius:12px">
      <p style="font-size:16px;font-weight:600;margin:0">${esc(quote.title)}</p>
      ${quote.description ? `<p style="font-size:14px;color:#7c736a;margin:6px 0 0;white-space:pre-line">${esc(quote.description)}</p>` : ""}
      <p style="font-size:22px;font-weight:700;color:#47645a;margin:10px 0 0">${price}</p>
    </div>
    <p style="margin:18px 0"><a href="${esc(payUrl)}" style="display:inline-block;background:#5b7c6f;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px;font-size:15px">Pay ${price} securely →</a></p>
    <p style="font-size:13px;color:#7c736a">Paid securely via Stripe. — ${esc(first)}</p>`);

  await send({
    to: quote.clientEmail,
    subject: `${teacher.name} sent you a quote: ${quote.title}`,
    html,
    text,
    replyTo: teacher.contactEmail || teacher.email,
  });
}

// On payment: receipt to the client + heads-up to the teacher.
export async function sendQuotePaidEmails({
  quote,
  teacher,
}: {
  quote: Quote;
  teacher: Teacher;
}): Promise<void> {
  const price = formatPrice(quote.priceCents);
  const clientHtml = wrapHtml(`
    <h1 style="font-size:18px">Payment received ✓</h1>
    <p style="font-size:14px">Thanks! Your payment to ${esc(teacher.name)} is confirmed.</p>
    <table style="font-size:14px;line-height:1.9;border-collapse:collapse;margin-top:8px">
      <tr><td style="color:#7c736a;padding-right:16px">For</td><td>${esc(quote.title)}</td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">Paid</td><td>${price}</td></tr>
    </table>
    <p style="font-size:13px;color:#7c736a;margin-top:12px">This email is your receipt. ${esc(teacher.name.split(" ")[0])} will be in touch.</p>`);
  const clientText = `Payment received. ${quote.title} — ${price} paid to ${teacher.name}. This is your receipt.`;

  const teacherHtml = wrapHtml(`
    <h1 style="font-size:18px">💰 Quote paid</h1>
    <p style="font-size:14px">${esc(quote.clientName || quote.clientEmail || "A client")} just paid your quote.</p>
    <table style="font-size:14px;line-height:1.9;border-collapse:collapse;margin-top:8px">
      <tr><td style="color:#7c736a;padding-right:16px">Quote</td><td>${esc(quote.title)}</td></tr>
      <tr><td style="color:#7c736a;padding-right:16px">Amount</td><td>${price}</td></tr>
    </table>
    <p style="font-size:13px;color:#7c736a;margin-top:12px">It's in your Kuleo balance, ready to cash out.</p>`);
  const teacherText = `Quote paid: ${quote.title} — ${price}. It's in your Kuleo balance.`;

  const jobs = [];
  if (quote.clientEmail) {
    jobs.push(send({
      to: quote.clientEmail,
      subject: `Receipt: ${quote.title} — ${price}`,
      html: clientHtml,
      text: clientText,
      replyTo: teacher.contactEmail || teacher.email,
    }));
  }
  jobs.push(send({
    to: teacher.email,
    subject: `Quote paid: ${quote.title} (${price})`,
    html: teacherHtml,
    text: teacherText,
  }));
  const results = await Promise.allSettled(jobs);
  results.forEach((r) => { if (r.status === "rejected") console.error("[quote] email failed", r.reason); });
}

// Sent once, when a teacher's Kuleo profile is first created (see session.ts).
// A warm welcome plus a fast-start guide so they know exactly what to do next,
// and a plain statement of how pricing/payouts work.
export async function sendWelcomeEmail(
  teacher: Teacher,
): Promise<{ sent: boolean }> {
  const first = teacher.name.split(" ")[0] || "there";
  const dash = "https://kuleo.io/dashboard";
  const subject = `Welcome to Kuleo, ${first} 🧘`;

  const text = [
    `Welcome to Kuleo, ${first}!`,
    ``,
    `You just opened your own yoga studio — bookings, payments, class passes, and a shareable page, all from one link. Here's how to be live today:`,
    ``,
    `1. Complete your profile — add a photo, a short bio, and your specialties.`,
    `2. Add a class and set your price.`,
    `3. Set your class times so students can book.`,
    `4. Share your booking link — first bookings almost always follow the first share.`,
    ``,
    `Set up here: ${dash}`,
    ``,
    `How you get paid: students pay you directly at checkout. Kuleo is a flat $15/month plus a 6% processing fee per sale — that covers card processing and keeps the platform running, with no surprise commissions. Cash out your balance anytime to Zelle, Venmo, or PayPal.`,
    ``,
    `I'm ${FOUNDER.name}, ${FOUNDER.title} of Kuleo — you have a direct line to me. Text or call ${FOUNDER.phone}, or just reply to this email. I highly recommend a quick, free onboarding call: ${FOUNDER.onboardingCallUrl}`,
    ``,
    `Welcome aboard,`,
    `${FOUNDER.name}`,
  ].join("\n");

  const html = wrapHtml(`
    <p style="font-size:16px;font-weight:600">Welcome to Kuleo, ${esc(first)}! 🎉</p>
    <p style="color:#4a4b47;font-size:14px;line-height:1.6">You just opened your own yoga studio — bookings, payments, class passes, and a shareable page, all from one link. Here's how to be live <strong>today</strong>:</p>
    <ol style="color:#26211c;font-size:14px;line-height:1.7;padding-left:18px;margin:12px 0">
      <li><strong>Complete your profile</strong> — photo, short bio, specialties.</li>
      <li><strong>Add a class &amp; set your price.</strong></li>
      <li><strong>Set your class times</strong> so students can book.</li>
      <li><strong>Share your booking link</strong> — first bookings follow the first share.</li>
    </ol>
    <p style="margin:20px 0">
      <a href="${dash}" style="background:#4a7c59;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:600;font-size:14px;display:inline-block">Set up your studio →</a>
    </p>
    <div style="margin-top:16px;padding:12px 14px;background:#edf2ef;border-radius:10px;font-size:13px;color:#26211c;line-height:1.6">
      <strong style="color:#47645a">How you get paid:</strong> students pay you directly at checkout. Kuleo is a flat <strong>$15/month</strong> plus a <strong>6% processing fee</strong> per sale — that covers card processing and keeps the platform running, with no surprise commissions. Cash out anytime to Zelle, Venmo, or PayPal.
    </div>
    <p style="color:#4a4b47;font-size:14px;margin-top:16px;line-height:1.6">
      I'm ${esc(FOUNDER.name)}, ${esc(FOUNDER.title)} of Kuleo — you've got a direct line to me. Text or call <strong>${esc(FOUNDER.phone)}</strong>, or just reply to this email. I highly recommend a quick, free <a href="${FOUNDER.onboardingCallUrl}" style="color:#47645a">onboarding call</a> so we get you earning fast.
    </p>
    <p style="color:#4a4b47;font-size:14px">Welcome aboard,<br>${esc(FOUNDER.name)}</p>
  `);

  return send({ to: teacher.email, subject, html, text, replyTo: FOUNDER.email });
}
