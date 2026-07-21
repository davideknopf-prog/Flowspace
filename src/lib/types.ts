// Core domain models for the yoga teacher OS.
// Kept deliberately plain so this maps 1:1 onto Postgres tables when we swap
// the JSON store for Supabase later.

export interface Teacher {
  id: string;
  slug: string; // public URL handle, e.g. /t/jane-doe
  email: string;
  name: string;
  headline: string; // short tagline shown on public page
  bio: string;
  location: string;
  specialties: string[];
  avatarUrl: string; // may be empty; we render initials fallback
  timezone: string; // IANA, e.g. "America/New_York"
  // The teacher's reusable "virtual studio room" (Zoom/Meet link). Online
  // sessions without their own link fall back to this at booking time.
  defaultMeetingUrl: string;
  createdAt: string;
  clerkUserId: string | null; // links this profile to a real Clerk account
  // Teacher's own Kuleo subscription (Stripe Billing). Status mirrors
  // Stripe's subscription status string ("active", "past_due", "canceled",
  // ...); "none" = never subscribed. Dashboard requires active/trialing.
  stripeCustomerId: string | null;
  subscriptionStatus: string;
  subscriptionPlan: string; // price lookup_key, e.g. "kuleo_monthly"
  subscriptionPeriodEnd: string | null;
}

export function isSubscribed(teacher: Teacher): boolean {
  return ["active", "trialing"].includes(teacher.subscriptionStatus);
}

export type LocationType = "online" | "in_person";

export interface SessionType {
  id: string;
  teacherId: string;
  name: string; // e.g. "Private Vinyasa (1:1)"
  description: string;
  durationMinutes: number;
  priceCents: number; // stored in cents; 0 = free/donation
  active: boolean;
  // How the class is delivered.
  locationType: LocationType;
  // For online: the teacher's own Zoom/Meet link (BYO — no video API yet).
  meetingUrl: string;
  // For in-person: the studio/home address. For online: optional extra notes
  // ("I'll admit you from the waiting room a few minutes early").
  locationNote: string;
}

// Weekly recurring availability. weekday: 0=Sun … 6=Sat.
// start/end are minutes from midnight in the teacher's timezone.
export interface AvailabilityRule {
  id: string;
  teacherId: string;
  weekday: number;
  startMinutes: number;
  endMinutes: number;
}

export type BookingStatus = "confirmed" | "cancelled";

// "pending" = Stripe Checkout created but not yet paid (holds the slot until
// the checkout completes or expires). "free" = no payment needed at all.
// "pass" = paid by redeeming a credit from a purchased pass.
export type PaymentStatus = "free" | "pending" | "paid" | "pass";

export interface Booking {
  id: string;
  teacherId: string;
  sessionTypeId: string;
  clientName: string;
  clientEmail: string;
  note: string;
  startISO: string; // absolute start time (UTC ISO)
  durationMinutes: number;
  priceCents: number;
  // Snapshot of delivery details at booking time, so editing a session type
  // later never rewrites the link/address a past student was given.
  locationType: LocationType;
  meetingUrl: string;
  locationNote: string;
  paymentStatus: PaymentStatus;
  status: BookingStatus;
  createdAt: string;
  // Set once a Stripe Checkout Session is created for this booking; null for
  // free bookings.
  stripeCheckoutSessionId: string | null;
  // Platform's cut of priceCents, captured at booking time so a later fee
  // change never rewrites history.
  platformFeeCents: number;
  // Stripe's actual processing fee for this charge (pulled from Stripe's
  // balance transaction, not estimated — varies by card type). The teacher
  // absorbs this, same as platformFeeCents: payout = priceCents -
  // platformFeeCents - stripeFeeCents. 0 until payment confirms.
  stripeFeeCents: number;
  // Set when this booking was paid by redeeming a pass credit.
  passId: string | null;
}

// A multi-class product a teacher sells (5-class pass, unlimited month, ...).
// creditCount null = unlimited during the validity window.
export interface Offer {
  id: string;
  teacherId: string;
  name: string;
  description: string;
  priceCents: number;
  creditCount: number | null;
  validDays: number | null;
  active: boolean;
  createdAt: string;
}

// A student's purchased offer. Bookings consume credits until none remain
// (or, for unlimited passes, until the pass expires).
export interface Pass {
  id: string;
  offerId: string;
  teacherId: string;
  clientName: string;
  clientEmail: string;
  creditsTotal: number | null;
  creditsUsed: number;
  priceCents: number;
  platformFeeCents: number;
  stripeFeeCents: number;
  paymentStatus: "pending" | "paid";
  stripeCheckoutSessionId: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export function passIsRedeemable(pass: Pass, now: Date): boolean {
  if (pass.paymentStatus !== "paid") return false;
  if (pass.expiresAt && new Date(pass.expiresAt) < now) return false;
  if (pass.creditsTotal != null && pass.creditsUsed >= pass.creditsTotal)
    return false;
  return true;
}

// A manual record that the founder paid a teacher out (bank transfer, Venmo,
// etc). No automated payout rail yet — see scripts/payout.mjs.
export interface Payout {
  id: string;
  teacherId: string;
  amountCents: number;
  note: string;
  createdAt: string;
}

export interface Database {
  teachers: Teacher[];
  sessionTypes: SessionType[];
  availability: AvailabilityRule[];
  bookings: Booking[];
  payouts: Payout[];
}
