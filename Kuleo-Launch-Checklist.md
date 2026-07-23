# Kuleo — Launch Readiness Checklist

_Pressure-tested from the codebase. Ordered by priority: do the P0 blockers before a single real dollar or teacher touches the site._

---

## The one thing to understand first: how money actually flows

Right now Kuleo takes payments as **platform charges** — when a student pays for a class, the money lands in **your** Stripe balance, **not** the teacher's. Teachers get paid when they request a **cash-out**, which you fulfill **manually** (Zelle/Venmo/PayPal) and then mark paid in your dashboard. There is no Stripe Connect / automatic split yet.

This is a fine v1, but it means: **you are the bank.** Every teacher must understand they get paid by you, on request, not instantly by Stripe. Make that explicit in onboarding. (Automating this with Stripe Connect is a real project for later — flag it when you're past the first handful of teachers.)

---

## P0 — Blockers (must be true before taking real money)

> If you'd rather onboard your first teachers on **comped/free plans** and keep payments in Stripe **test mode** for a few days, you can defer the live-Stripe items (marked ⚡). That's a legitimate soft-launch and lowers risk. Everything not marked ⚡ still applies.

- [ ] **⚡ Flip Stripe to live keys.** In Vercel → Project → Settings → Environment Variables (Production): set `STRIPE_SECRET_KEY` to your `sk_live_…` key. Update the publishable key too if used.
- [ ] **⚡ Create live subscription prices.** Run `scripts/setup-stripe-prices.mjs` against your **live** Stripe account so the plan `lookup_key`s exist in live mode. Without this, teacher sign-up checkout can't find a price and fails.
- [ ] **⚡ Register the live Stripe webhook.** In the Stripe dashboard (live mode) add endpoint `https://kuleo.io/api/stripe/webhook` with events: `checkout.session.completed`, `checkout.session.expired`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Copy its signing secret into `STRIPE_WEBHOOK_SECRET` (Production). **Without this, payments won't reliably confirm** — only the success-page fallback would, and subscription status wouldn't sync.
- [ ] **Email deliverability (this is the most-missed one).** In Resend: **verify your sending domain** (kuleo.io — add the DNS records). Then set `RESEND_API_KEY` and `EMAIL_FROM="Kuleo <hello@kuleo.io>"` in Vercel Production. ⚠️ **If `RESEND_API_KEY` is unset, Kuleo silently does NOT send emails** — booking confirmations and receipts just never arrive. And with an unverified domain, Resend only delivers to your own address. Confirmation emails ARE your students' receipts, so this is launch-critical.
- [ ] **Clerk on production keys.** Confirm Vercel has your **production** Clerk keys (`CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`), not dev. Dev instances have warning banners, separate user pools, and stricter limits. Then actually sign up + log in on kuleo.io to confirm.
- [ ] **Verify the full env-var set in Vercel Production:**
  `DATABASE_URL` · `STRIPE_SECRET_KEY` · `STRIPE_WEBHOOK_SECRET` · `RESEND_API_KEY` · `EMAIL_FROM` · `FOUNDER_EMAILS` (must include `upshiftsolutionsllc@gmail.com`) · `PLATFORM_FEE_PERCENT` · `NEXT_PUBLIC_SITE_URL` (=`https://kuleo.io`) · `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` · `BLOB_READ_WRITE_TOKEN` (photo/banner uploads) · `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST` · `CRON_SECRET`.
- [ ] **Confirm `FOUNDER_EMAILS` is right.** It gates your founder powers (view-as, mission control, cash-out queue) and bypasses the paywall. Your email must be in it.

---

## P1 — Do before / during onboarding the first teachers

- [ ] **Run the live smoke test** (script below) end-to-end on kuleo.io. Don't skip this — it's the single highest-value 20 minutes.
- [ ] **Follow-up emails cron.** `/api/cron/followups` powers post-class follow-up + review-request emails and is protected by `CRON_SECRET`. Confirm a Vercel Cron job is scheduled to hit it and that `CRON_SECRET` is set. (Retention nicety, not a blocker.)
- [ ] **PostHog is receiving events.** Open your PostHog project and confirm pageviews/events from kuleo.io are flowing, so you can watch the signup→book funnel and catch client errors during launch week.
- [ ] **Decide your payout SLA.** Tell teachers how fast you'll pay a cash-out (e.g. "within 2 business days"). Set the expectation before they ask.
- [ ] **Skim Terms & Privacy.** `/terms` and `/privacy` exist — give them a read so they reflect your actual business and payout model.
- [ ] **Pick your pricing story.** Know exactly what you'll tell a teacher the plan costs and what the platform fee (`PLATFORM_FEE_PERCENT`) takes per booking, so there are no surprises.

## ✅ Already handled (done this session)

- Friendly **error / not-found pages** — a bad link or unexpected error now shows an on-brand recovery screen, not a raw crash.
- **Demo teachers can't be booked** — server-side block, independent of Stripe mode.
- **Deleting a booked class no longer 500s**; class edits are non-destructive.
- **Mission control roster** at `/dashboard/roster` to manage all teachers.
- **Mobile dashboard nav**, custom quotes, and the live-data `/teachers` + `/demo` pages.
- **Link integrity** — automated audit passes (every internal link resolves).

---

## Live smoke test (run on kuleo.io before you invite anyone)

Do this as if you were a brand-new teacher, ideally in an incognito window. If Stripe is live, use a real card for a **small** amount and refund it after.

1. **Sign up** as a fresh teacher → you should land on the dashboard (or the subscribe/plan screen). Pick/comp a plan.
2. **Build your studio:** add a class with a price, set a class time, complete the profile (bio + photo).
3. **Grab your public link** and open `/t/your-slug` in incognito.
4. **Book a class** → pay → you should be redirected to the "booked" page **and receive a confirmation email**. ← this proves payments + email both work.
5. **Buy a pass** → confirm it succeeds and shows up.
6. **Try booking a demo teacher** (e.g. `/t/maya-chen`) → confirm booking is blocked ("sample studio").
7. **Request a cash-out** as the teacher → switch to your founder view → see it in the cash-out queue → mark it paid → teacher gets the payout email.
8. **Open mission control** (`/dashboard/roster`) → confirm the new teacher and their activity show up.
9. If you used a live card, **refund the test charge** in Stripe.

If every step passes, you're rock solid.

---

## First-teacher onboarding runbook

1. Send them their **signup link**; have them create the account and choose a plan (or comp them for the pilot).
2. Book the **onboarding call** (your Calendly link is already on their dashboard) — a 15-min call massively lifts activation.
3. On the call, walk them through: **profile → add a class + price → set class times → copy booking link.**
4. Have them do a **test booking on themselves** so they see the whole flow and get the confirmation email.
5. Tell them **how they get paid** (you, via cash-out, within your SLA).
6. Share their link; watch **mission control** for their first real booking, and check in when it lands.

---

## Next, after the first few teachers settle in

- **Stripe Connect** for automatic teacher payouts (removes you as the manual middleman).
- **Editable notes/feedback per teacher** on the mission-control roster, so qualitative feedback lives next to the numbers.
- Whatever the first teachers tell you is annoying — that feedback is the roadmap.
