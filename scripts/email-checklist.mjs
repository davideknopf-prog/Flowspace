// One-off: email the launch-readiness checklist to the founder using the
// Resend key already in .env.local. Runs on the founder's machine (which can
// reach api.resend.com). Sends from Resend's always-available shared domain so
// it works whether or not kuleo.io is verified yet.
// Run: node scripts/email-checklist.mjs
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const KEY = process.env.RESEND_API_KEY;
const TO = "upshiftsolutionsllc@gmail.com";
// Try your verified domain first (works to any recipient); fall back to
// Resend's shared sender (works to your own account email even before your
// domain is verified). Whichever succeeds, wins.
const FROMS = [
  process.env.EMAIL_FROM || "Kuleo <books@kuleo.io>",
  "Kuleo Launch <onboarding@resend.dev>",
];

if (!KEY) {
  console.error("No RESEND_API_KEY in .env.local — cannot send.");
  process.exit(1);
}

const text = `KULEO — LAUNCH READINESS CHECKLIST

HOW MONEY FLOWS (understand this first)
Kuleo takes payments as platform charges — money lands in YOUR Stripe balance, not the teacher's. Teachers get paid when they request a cash-out, which you fulfill manually (Zelle/Venmo/PayPal) and mark paid. You are the bank. Every teacher must understand this up front.

P0 — BLOCKERS (before taking real money)
(You can soft-launch teachers on comped plans with Stripe in TEST mode to defer the ⚡ items.)
[ ] ⚡ Flip Stripe to live: set STRIPE_SECRET_KEY = sk_live_… in Vercel (Production).
[ ] ⚡ Create live subscription prices: run scripts/setup-stripe-prices.mjs against LIVE Stripe.
[ ] ⚡ Register the live Stripe webhook at https://kuleo.io/api/stripe/webhook (events: checkout.session.completed, checkout.session.expired, customer.subscription.created/updated/deleted). Put its signing secret in STRIPE_WEBHOOK_SECRET.
[ ] EMAIL — the most-missed one. In Resend: verify your kuleo.io domain (DNS records). Set RESEND_API_KEY and EMAIL_FROM = "Kuleo <books@kuleo.io>" in Vercel. If RESEND_API_KEY is unset, Kuleo sends NO emails (confirmations, receipts, the "you just earned $X" emails) — they silently don't send.
[ ] Clerk on PRODUCTION keys (not dev): CLERK_SECRET_KEY + NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY. Then sign up + log in on kuleo.io to confirm.
[ ] Set PLATFORM_FEE_PERCENT = 6 in Vercel (the new pricing model). If it's set to 0 it overrides the new default.
[ ] Confirm FOUNDER_EMAILS includes upshiftsolutionsllc@gmail.com (gates your founder powers + mission control).

FULL ENV-VAR SET TO VERIFY IN VERCEL (PRODUCTION):
- DATABASE_URL
- STRIPE_SECRET_KEY (sk_live_… at launch)
- STRIPE_WEBHOOK_SECRET (from the live webhook)
- RESEND_API_KEY
- EMAIL_FROM = "Kuleo <books@kuleo.io>"
- PLATFORM_FEE_PERCENT = 6
- FOUNDER_EMAILS = upshiftsolutionsllc@gmail.com
- NEXT_PUBLIC_SITE_URL = https://kuleo.io
- CLERK_SECRET_KEY + NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (production)
- BLOB_READ_WRITE_TOKEN (photo/banner uploads)
- NEXT_PUBLIC_POSTHOG_KEY + NEXT_PUBLIC_POSTHOG_HOST
- CRON_SECRET (follow-up emails)
(These are NAMES to set in Vercel — the secret values live only there, never in email.)

P1 — DURING FIRST ONBOARDING
[ ] Run the live smoke test end-to-end (below).
[ ] Confirm the follow-up cron (/api/cron/followups) is scheduled in Vercel + CRON_SECRET set.
[ ] Confirm PostHog is receiving events.
[ ] Decide your payout SLA (e.g. "paid within 2 business days") and tell teachers.
[ ] Skim /terms and /privacy.

ALREADY DONE (this build):
- Friendly error / not-found pages
- Demo teachers can't be booked (server-side, any Stripe mode)
- Deleting a booked class no longer crashes; class edits non-destructive
- Mission control roster at /dashboard/roster
- Mobile dashboard nav, custom quotes, live /teachers + /demo
- Welcome email on signup; "you just earned $X" teacher emails
- $15/month + flat 6% processing fee across the whole site
- Link audit passes

LIVE SMOKE TEST (run on kuleo.io before inviting anyone; use a real card for a small amount and refund after if Stripe is live):
1. Sign up as a fresh teacher -> reach dashboard/subscribe.
2. Add a class + price, set a time, complete profile.
3. Open /t/your-slug in incognito.
4. Book a class -> pay -> confirmation email arrives (proves payments + email).
5. Buy a pass -> confirm.
6. Try booking a demo teacher -> confirm it's blocked.
7. Request a cash-out -> founder view -> mark paid -> teacher gets payout email.
8. Open /dashboard/roster -> confirm activity shows.
9. Refund the live test charge in Stripe.

FIRST-TEACHER ONBOARDING RUNBOOK:
1. Send signup link; they create account + pick/comp a plan.
2. Book the onboarding call (Calendly link is on their dashboard).
3. On the call: profile -> add a class + price -> set times -> copy booking link.
4. Have them do a test booking on themselves.
5. Tell them how they get paid (you, via cash-out, within your SLA).
6. Share their link; watch mission control for the first real booking.

You've got this. — sent from your Kuleo workspace`;

const esc = (v) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:640px;margin:0 auto;color:#26211c;line-height:1.55">
<div style="font-size:22px;font-weight:700;color:#4a7c59;margin-bottom:4px">🧘 Kuleo — Launch Checklist</div>
<p style="color:#7c736a;margin-top:0">Your prep for tomorrow. Work top-down; the P0 items are the real blockers.</p>
<div style="background:#edf2ef;border-radius:10px;padding:12px 14px;font-size:14px;margin:16px 0">
<strong style="color:#47645a">How money flows (know this first):</strong> Kuleo collects payments into <em>your</em> Stripe balance — teachers get paid when they request a cash-out that you fulfill manually (Zelle/Venmo/PayPal). You are the bank. Every teacher must understand that up front.
</div>
<h2 style="font-size:16px;color:#26211c;border-bottom:2px solid #4a7c59;padding-bottom:4px">P0 — Blockers (before real money)</h2>
<p style="font-size:13px;color:#7c736a;margin:6px 0">You can soft-launch on comped plans with Stripe in TEST mode to defer the ⚡ items.</p>
<ul style="font-size:14px;padding-left:18px">
<li>⚡ <strong>Stripe live keys:</strong> set <code>STRIPE_SECRET_KEY = sk_live_…</code> in Vercel.</li>
<li>⚡ <strong>Live prices:</strong> run <code>scripts/setup-stripe-prices.mjs</code> against LIVE Stripe.</li>
<li>⚡ <strong>Live webhook</strong> at <code>https://kuleo.io/api/stripe/webhook</code> (events: checkout.session.completed/expired, customer.subscription.created/updated/deleted) → put its secret in <code>STRIPE_WEBHOOK_SECRET</code>.</li>
<li><strong>Email (most-missed):</strong> verify your <strong>kuleo.io domain in Resend</strong>, set <code>RESEND_API_KEY</code> + <code>EMAIL_FROM</code>. If the key is unset, Kuleo sends <strong>no emails at all</strong> — confirmations, receipts, and the "you just earned $X" emails silently don't send.</li>
<li><strong>Clerk production keys</strong> (not dev), then test signup + login on kuleo.io.</li>
<li><strong>Set <code>PLATFORM_FEE_PERCENT = 6</code></strong> in Vercel (a stray <code>0</code> would override the new default).</li>
<li>Confirm <code>FOUNDER_EMAILS</code> includes your email (gates founder powers + mission control).</li>
</ul>
<div style="background:#faf8f5;border:1px solid #e7e0d8;border-radius:10px;padding:12px 14px;font-size:13px;margin:12px 0">
<strong>Env vars to verify in Vercel (Production) — names only, values live in Vercel:</strong><br>
DATABASE_URL · STRIPE_SECRET_KEY · STRIPE_WEBHOOK_SECRET · RESEND_API_KEY · EMAIL_FROM · PLATFORM_FEE_PERCENT=6 · FOUNDER_EMAILS · NEXT_PUBLIC_SITE_URL=https://kuleo.io · CLERK_SECRET_KEY · NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY · BLOB_READ_WRITE_TOKEN · NEXT_PUBLIC_POSTHOG_KEY · NEXT_PUBLIC_POSTHOG_HOST · CRON_SECRET
</div>
<h2 style="font-size:16px;color:#26211c;border-bottom:2px solid #4a7c59;padding-bottom:4px">P1 — During first onboarding</h2>
<ul style="font-size:14px;padding-left:18px">
<li>Run the live smoke test end-to-end (below).</li>
<li>Confirm the follow-up cron is scheduled + <code>CRON_SECRET</code> set.</li>
<li>Confirm PostHog is receiving events.</li>
<li>Decide your payout SLA and tell teachers.</li>
<li>Skim /terms and /privacy.</li>
</ul>
<h2 style="font-size:16px;color:#26211c;border-bottom:2px solid #4a7c59;padding-bottom:4px">Live smoke test</h2>
<p style="font-size:13px;color:#7c736a;margin:6px 0">Do this on kuleo.io before inviting anyone. Real card for a small amount; refund after if Stripe is live.</p>
<ol style="font-size:14px;padding-left:18px">
<li>Sign up as a fresh teacher → dashboard/subscribe.</li>
<li>Add a class + price, set a time, complete profile.</li>
<li>Open <code>/t/your-slug</code> in incognito.</li>
<li>Book a class → pay → <strong>confirmation email arrives</strong> (proves payments + email).</li>
<li>Buy a pass → confirm.</li>
<li>Try booking a demo teacher → confirm it's blocked.</li>
<li>Request a cash-out → founder view → mark paid → teacher gets the email.</li>
<li>Open <code>/dashboard/roster</code> → confirm activity shows.</li>
<li>Refund the live test charge in Stripe.</li>
</ol>
<h2 style="font-size:16px;color:#26211c;border-bottom:2px solid #4a7c59;padding-bottom:4px">First-teacher onboarding runbook</h2>
<ol style="font-size:14px;padding-left:18px">
<li>Send signup link; they create an account + pick/comp a plan.</li>
<li>Book the onboarding call (Calendly link is on their dashboard).</li>
<li>On the call: profile → add a class + price → set times → copy booking link.</li>
<li>Have them do a test booking on themselves.</li>
<li>Tell them how they get paid (you, via cash-out, within your SLA).</li>
<li>Share their link; watch mission control for the first real booking.</li>
</ol>
<p style="color:#7c736a;font-size:12px;margin-top:24px">You've got this. — sent from your Kuleo workspace 🧘</p>
</div>`;

let sent = false;
for (const from of FROMS) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: TO,
      subject: "🚀 Kuleo launch checklist — your prep for tomorrow",
      html,
      text,
    }),
  });
  if (res.ok) {
    const data = await res.json();
    console.log(`✓ Sent to ${TO} from ${from} (Resend id: ${data.id})`);
    sent = true;
    break;
  }
  console.warn(`… "${from}" was rejected (${res.status}): ${await res.text()}`);
}
if (!sent) {
  console.error("\nCould not send from any sender. Most likely your kuleo.io domain isn't verified in Resend yet AND the recipient isn't your Resend account email. Verify the domain (it's a launch step anyway) and re-run.");
  process.exit(1);
}
