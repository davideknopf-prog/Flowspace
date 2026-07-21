import { sql } from "./sql";
import { newId, slugify } from "./db";
import type {
  Teacher,
  SessionType,
  AvailabilityRule,
  Booking,
  Offer,
  Pass,
  Payout,
  PayoutMethod,
  PayoutRequest,
  Review,
  ReviewStats,
} from "./types";
import { passIsRedeemable } from "./types";

// Single knob for the platform's cut of each paid booking. A plain env var
// (not a DB setting) is enough for now — changing it is a deliberate,
// infrequent act, not something that needs a UI. Defaults to 0% (teachers
// keep everything while we're still acquiring the first cohort).
export function platformFeePercent(): number {
  const raw = Number(process.env.PLATFORM_FEE_PERCENT ?? "0");
  return Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : 0;
}

export function computePlatformFeeCents(priceCents: number): number {
  return Math.round((priceCents * platformFeePercent()) / 100);
}

// Typed accessors over the real Postgres database. Components/actions call
// these, never `sql` directly, so a future storage swap stays contained here.

function toISO(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return new Date(v).toISOString();
  return new Date().toISOString();
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function rowToTeacher(row: Record<string, unknown>): Teacher {
  return {
    id: row.id as string,
    slug: row.slug as string,
    email: row.email as string,
    name: row.name as string,
    headline: row.headline as string,
    bio: row.bio as string,
    location: row.location as string,
    specialties: asStringArray(row.specialties),
    avatarUrl: row.avatar_url as string,
    timezone: row.timezone as string,
    defaultMeetingUrl: (row.default_meeting_url as string) ?? "",
    payoutMethod: ((row.payout_method as string) ?? "") as Teacher["payoutMethod"],
    payoutHandle: (row.payout_handle as string) ?? "",
    createdAt: toISO(row.created_at),
    clerkUserId: (row.clerk_user_id as string | null) ?? null,
    stripeCustomerId: (row.stripe_customer_id as string | null) ?? null,
    subscriptionStatus: (row.subscription_status as string) ?? "none",
    subscriptionPlan: (row.subscription_plan as string) ?? "",
    subscriptionPeriodEnd: row.subscription_period_end
      ? toISO(row.subscription_period_end)
      : null,
  };
}

function rowToSessionType(row: Record<string, unknown>): SessionType {
  return {
    id: row.id as string,
    teacherId: row.teacher_id as string,
    name: row.name as string,
    description: row.description as string,
    durationMinutes: row.duration_minutes as number,
    priceCents: row.price_cents as number,
    active: row.active as boolean,
    locationType: row.location_type as SessionType["locationType"],
    meetingUrl: row.meeting_url as string,
    locationNote: row.location_note as string,
  };
}

function rowToAvailability(row: Record<string, unknown>): AvailabilityRule {
  return {
    id: row.id as string,
    teacherId: row.teacher_id as string,
    weekday: row.weekday as number,
    startMinutes: row.start_minutes as number,
    endMinutes: row.end_minutes as number,
  };
}

function rowToBooking(row: Record<string, unknown>): Booking {
  return {
    id: row.id as string,
    teacherId: row.teacher_id as string,
    sessionTypeId: row.session_type_id as string,
    clientName: row.client_name as string,
    clientEmail: row.client_email as string,
    note: row.note as string,
    startISO: toISO(row.start_iso),
    durationMinutes: row.duration_minutes as number,
    priceCents: row.price_cents as number,
    locationType: row.location_type as Booking["locationType"],
    meetingUrl: row.meeting_url as string,
    locationNote: row.location_note as string,
    paymentStatus: row.payment_status as Booking["paymentStatus"],
    status: row.status as Booking["status"],
    createdAt: toISO(row.created_at),
    stripeCheckoutSessionId: (row.stripe_checkout_session_id as string | null) ?? null,
    platformFeeCents: row.platform_fee_cents as number,
    stripeFeeCents: row.stripe_fee_cents as number,
    passId: (row.pass_id as string | null) ?? null,
  };
}

function rowToOffer(row: Record<string, unknown>): Offer {
  return {
    id: row.id as string,
    teacherId: row.teacher_id as string,
    name: row.name as string,
    description: row.description as string,
    priceCents: row.price_cents as number,
    creditCount: (row.credit_count as number | null) ?? null,
    validDays: (row.valid_days as number | null) ?? null,
    active: row.active as boolean,
    createdAt: toISO(row.created_at),
  };
}

function rowToPass(row: Record<string, unknown>): Pass {
  return {
    id: row.id as string,
    offerId: row.offer_id as string,
    teacherId: row.teacher_id as string,
    clientName: row.client_name as string,
    clientEmail: row.client_email as string,
    creditsTotal: (row.credits_total as number | null) ?? null,
    creditsUsed: row.credits_used as number,
    priceCents: row.price_cents as number,
    platformFeeCents: row.platform_fee_cents as number,
    stripeFeeCents: row.stripe_fee_cents as number,
    paymentStatus: row.payment_status as Pass["paymentStatus"],
    stripeCheckoutSessionId:
      (row.stripe_checkout_session_id as string | null) ?? null,
    expiresAt: row.expires_at ? toISO(row.expires_at) : null,
    createdAt: toISO(row.created_at),
  };
}

function rowToPayout(row: Record<string, unknown>): Payout {
  return {
    id: row.id as string,
    teacherId: row.teacher_id as string,
    amountCents: row.amount_cents as number,
    note: row.note as string,
    createdAt: toISO(row.created_at),
  };
}

function rowToPayoutRequest(row: Record<string, unknown>): PayoutRequest {
  return {
    id: row.id as string,
    teacherId: row.teacher_id as string,
    amountCents: row.amount_cents as number,
    method: row.method as PayoutMethod,
    handle: row.handle as string,
    status: row.status as PayoutRequest["status"],
    payoutId: (row.payout_id as string | null) ?? null,
    createdAt: toISO(row.created_at),
    paidAt: row.paid_at ? toISO(row.paid_at) : null,
  };
}

// --- Teachers ------------------------------------------------------------

export async function getTeacherById(id: string): Promise<Teacher | null> {
  const rows = await sql`select * from teachers where id = ${id}`;
  return rows[0] ? rowToTeacher(rows[0]) : null;
}

export async function listAllTeachers(): Promise<Teacher[]> {
  const rows = await sql`select * from teachers order by created_at`;
  return rows.map(rowToTeacher);
}

export async function getTeacherBySlug(slug: string): Promise<Teacher | null> {
  const rows = await sql`select * from teachers where slug = ${slug}`;
  return rows[0] ? rowToTeacher(rows[0]) : null;
}

export async function getTeacherByEmail(email: string): Promise<Teacher | null> {
  const rows =
    await sql`select * from teachers where lower(email) = ${email.toLowerCase()}`;
  return rows[0] ? rowToTeacher(rows[0]) : null;
}

export async function getTeacherByClerkUserId(
  clerkUserId: string,
): Promise<Teacher | null> {
  const rows =
    await sql`select * from teachers where clerk_user_id = ${clerkUserId}`;
  return rows[0] ? rowToTeacher(rows[0]) : null;
}

// Re-point a teacher row at a different Clerk user. Needed when the auth
// instance changes (e.g. the dev -> production Clerk migration): the teacher
// row survives, the Clerk user id doesn't.
export async function setTeacherClerkUserId(
  teacherId: string,
  clerkUserId: string,
): Promise<void> {
  await sql`
    update teachers set clerk_user_id = ${clerkUserId} where id = ${teacherId}
  `;
}

export async function getTeacherByStripeCustomerId(
  customerId: string,
): Promise<Teacher | null> {
  const rows =
    await sql`select * from teachers where stripe_customer_id = ${customerId}`;
  return rows[0] ? rowToTeacher(rows[0]) : null;
}

export async function setTeacherStripeCustomer(
  teacherId: string,
  stripeCustomerId: string,
): Promise<void> {
  await sql`
    update teachers set stripe_customer_id = ${stripeCustomerId}
    where id = ${teacherId} and stripe_customer_id is null
  `;
}

// Mirrors Stripe's subscription state onto the teacher row. Stripe is the
// source of truth — this is only ever called with values read from Stripe
// (webhook events or post-checkout verification), never invented locally.
export async function setTeacherSubscription(
  teacherId: string,
  data: {
    status: string;
    plan: string;
    periodEnd: string | null;
  },
): Promise<void> {
  await sql`
    update teachers set
      subscription_status = ${data.status},
      subscription_plan = ${data.plan},
      subscription_period_end = ${data.periodEnd}
    where id = ${teacherId}
  `;
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "teacher";
  let candidate = root;
  let n = 2;
  // Low-volume signup flow — a small sequential check loop is plenty here.
  while (true) {
    const rows = await sql`select 1 from teachers where slug = ${candidate}`;
    if (rows.length === 0) return candidate;
    candidate = `${root}-${n}`;
    n += 1;
  }
}

export async function createTeacher(
  email: string,
  name: string,
  clerkUserId: string,
): Promise<Teacher> {
  const id = newId("tch");
  const slug = await uniqueSlug(name || email.split("@")[0]);
  const displayName = name || email.split("@")[0];
  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";

  const rows = await sql`
    insert into teachers (id, slug, email, name, headline, bio, location, specialties, avatar_url, timezone, clerk_user_id)
    values (${id}, ${slug}, ${email}, ${displayName}, 'Yoga teacher', '', '', '[]'::jsonb, '', ${timezone}, ${clerkUserId})
    returning *
  `;
  return rowToTeacher(rows[0]);
}

export async function updateTeacher(
  id: string,
  patch: Partial<Omit<Teacher, "id" | "createdAt">>,
): Promise<Teacher | null> {
  const existing = await getTeacherById(id);
  if (!existing) return null;
  const merged: Teacher = { ...existing, ...patch };

  const rows = await sql`
    update teachers set
      slug = ${merged.slug},
      email = ${merged.email},
      name = ${merged.name},
      headline = ${merged.headline},
      bio = ${merged.bio},
      location = ${merged.location},
      specialties = ${JSON.stringify(merged.specialties)}::jsonb,
      avatar_url = ${merged.avatarUrl},
      timezone = ${merged.timezone},
      default_meeting_url = ${merged.defaultMeetingUrl},
      payout_method = ${merged.payoutMethod},
      payout_handle = ${merged.payoutHandle}
    where id = ${id}
    returning *
  `;
  return rows[0] ? rowToTeacher(rows[0]) : null;
}

// --- Session types ---------------------------------------------------------

export async function listSessionTypes(
  teacherId: string,
): Promise<SessionType[]> {
  const rows =
    await sql`select * from session_types where teacher_id = ${teacherId}`;
  return rows.map(rowToSessionType);
}

export async function createSessionType(
  teacherId: string,
  data: Pick<
    SessionType,
    | "name"
    | "description"
    | "durationMinutes"
    | "priceCents"
    | "locationType"
    | "meetingUrl"
    | "locationNote"
  >,
): Promise<SessionType> {
  const id = newId("ses");
  const rows = await sql`
    insert into session_types
      (id, teacher_id, name, description, duration_minutes, price_cents, active, location_type, meeting_url, location_note)
    values
      (${id}, ${teacherId}, ${data.name}, ${data.description}, ${data.durationMinutes}, ${data.priceCents}, true, ${data.locationType}, ${data.meetingUrl}, ${data.locationNote})
    returning *
  `;
  return rowToSessionType(rows[0]);
}

export async function deleteSessionType(
  teacherId: string,
  id: string,
): Promise<void> {
  await sql`delete from session_types where id = ${id} and teacher_id = ${teacherId}`;
}

export async function getSessionType(id: string): Promise<SessionType | null> {
  const rows = await sql`select * from session_types where id = ${id}`;
  return rows[0] ? rowToSessionType(rows[0]) : null;
}

// --- Availability ------------------------------------------------------------

export async function listAvailability(
  teacherId: string,
): Promise<AvailabilityRule[]> {
  const rows = await sql`
    select * from availability
    where teacher_id = ${teacherId}
    order by weekday, start_minutes
  `;
  return rows.map(rowToAvailability);
}

export async function setAvailability(
  teacherId: string,
  rules: Array<Pick<AvailabilityRule, "weekday" | "startMinutes" | "endMinutes">>,
): Promise<void> {
  await sql`delete from availability where teacher_id = ${teacherId}`;
  for (const r of rules) {
    const id = newId("avl");
    await sql`
      insert into availability (id, teacher_id, weekday, start_minutes, end_minutes)
      values (${id}, ${teacherId}, ${r.weekday}, ${r.startMinutes}, ${r.endMinutes})
    `;
  }
}

// --- Bookings ----------------------------------------------------------------

export async function listBookings(teacherId: string): Promise<Booking[]> {
  const rows = await sql`
    select * from bookings
    where teacher_id = ${teacherId}
    order by start_iso
  `;
  return rows.map(rowToBooking);
}

export async function getBookingById(id: string): Promise<Booking | null> {
  const rows = await sql`select * from bookings where id = ${id}`;
  return rows[0] ? rowToBooking(rows[0]) : null;
}

export async function getBookingByStripeSessionId(
  sessionId: string,
): Promise<Booking | null> {
  const rows =
    await sql`select * from bookings where stripe_checkout_session_id = ${sessionId}`;
  return rows[0] ? rowToBooking(rows[0]) : null;
}

// Creates a booking. For free sessions, pass paymentStatus "free" and it's
// immediately confirmed. For paid sessions, pass "pending" — the slot is held
// but the booking isn't "real" until markBookingPaid() promotes it (called by
// the Stripe webhook or the confirmation page's fallback verification).
export async function createBooking(
  data: Omit<Booking, "id" | "createdAt" | "status" | "stripeFeeCents">,
): Promise<Booking> {
  const id = newId("bkg");
  const rows = await sql`
    insert into bookings
      (id, teacher_id, session_type_id, client_name, client_email, note, start_iso,
       duration_minutes, price_cents, location_type, meeting_url, location_note,
       payment_status, status, stripe_checkout_session_id, platform_fee_cents, pass_id)
    values
      (${id}, ${data.teacherId}, ${data.sessionTypeId}, ${data.clientName}, ${data.clientEmail}, ${data.note}, ${data.startISO},
       ${data.durationMinutes}, ${data.priceCents}, ${data.locationType}, ${data.meetingUrl}, ${data.locationNote},
       ${data.paymentStatus}, 'confirmed', ${data.stripeCheckoutSessionId}, ${data.platformFeeCents}, ${data.passId})
    returning *
  `;
  return rowToBooking(rows[0]);
}

export async function attachStripeSession(
  bookingId: string,
  stripeCheckoutSessionId: string,
): Promise<void> {
  await sql`
    update bookings set stripe_checkout_session_id = ${stripeCheckoutSessionId}
    where id = ${bookingId}
  `;
}

// Idempotent: only transitions pending -> paid. Returns the booking if this
// call actually made the transition (so the caller knows to send emails),
// or null if it was already paid/missing (webhook and confirmation-page
// fallback can both call this safely — only one of them "wins").
// stripeFeeCents is Stripe's actual processing fee for this charge (looked
// up from the balance transaction, not estimated) — the teacher absorbs it,
// same as the platform fee.
export async function markBookingPaid(
  id: string,
  stripeFeeCents: number,
): Promise<Booking | null> {
  const rows = await sql`
    update bookings set payment_status = 'paid', stripe_fee_cents = ${stripeFeeCents}
    where id = ${id} and payment_status = 'pending'
    returning *
  `;
  return rows[0] ? rowToBooking(rows[0]) : null;
}

// A pending booking whose Checkout Session expired unpaid — delete it so the
// slot frees back up (an abandoned checkout shouldn't block a real student).
export async function deletePendingBooking(id: string): Promise<void> {
  await sql`delete from bookings where id = ${id} and payment_status = 'pending'`;
}

// Narrow, safe exception to "only touch pending bookings": if a booking was
// already marked paid before Stripe's balance transaction was ready, this
// fills in the fee after the fact. Guarded so it only ever moves 0 -> a real
// value, never overwrites an already-recorded fee.
export async function backfillStripeFee(
  id: string,
  stripeFeeCents: number,
): Promise<void> {
  await sql`
    update bookings set stripe_fee_cents = ${stripeFeeCents}
    where id = ${id} and payment_status = 'paid' and stripe_fee_cents = 0
  `;
}

// --- Offers ------------------------------------------------------------------

export async function listOffers(teacherId: string): Promise<Offer[]> {
  const rows = await sql`
    select * from offers where teacher_id = ${teacherId} order by created_at
  `;
  return rows.map(rowToOffer);
}

export async function getOffer(id: string): Promise<Offer | null> {
  const rows = await sql`select * from offers where id = ${id}`;
  return rows[0] ? rowToOffer(rows[0]) : null;
}

export async function createOffer(
  teacherId: string,
  data: Pick<Offer, "name" | "description" | "priceCents" | "creditCount" | "validDays">,
): Promise<Offer> {
  const id = newId("off");
  const rows = await sql`
    insert into offers (id, teacher_id, name, description, price_cents, credit_count, valid_days, active)
    values (${id}, ${teacherId}, ${data.name}, ${data.description}, ${data.priceCents}, ${data.creditCount}, ${data.validDays}, true)
    returning *
  `;
  return rowToOffer(rows[0]);
}

export async function deleteOffer(teacherId: string, id: string): Promise<void> {
  // Offers with sold passes are deactivated (passes reference them); unsold
  // ones are removed outright.
  const passes = await sql`select 1 from passes where offer_id = ${id} limit 1`;
  if (passes.length > 0) {
    await sql`update offers set active = false where id = ${id} and teacher_id = ${teacherId}`;
  } else {
    await sql`delete from offers where id = ${id} and teacher_id = ${teacherId}`;
  }
}

// --- Passes ------------------------------------------------------------------

export async function createPendingPass(
  offer: Offer,
  clientName: string,
  clientEmail: string,
  platformFeeCents: number,
): Promise<Pass> {
  const id = newId("pas");
  // expires_at is set at purchase time from the offer's validity window.
  const expiresAt = offer.validDays
    ? new Date(Date.now() + offer.validDays * 24 * 60 * 60_000).toISOString()
    : null;
  const rows = await sql`
    insert into passes
      (id, offer_id, teacher_id, client_name, client_email, credits_total,
       price_cents, platform_fee_cents, payment_status, expires_at)
    values
      (${id}, ${offer.id}, ${offer.teacherId}, ${clientName}, ${clientEmail}, ${offer.creditCount},
       ${offer.priceCents}, ${platformFeeCents}, 'pending', ${expiresAt})
    returning *
  `;
  return rowToPass(rows[0]);
}

export async function attachPassStripeSession(
  passId: string,
  stripeCheckoutSessionId: string,
): Promise<void> {
  await sql`
    update passes set stripe_checkout_session_id = ${stripeCheckoutSessionId}
    where id = ${passId}
  `;
}

export async function getPassById(id: string): Promise<Pass | null> {
  const rows = await sql`select * from passes where id = ${id}`;
  return rows[0] ? rowToPass(rows[0]) : null;
}

export async function getPassByStripeSessionId(
  sessionId: string,
): Promise<Pass | null> {
  const rows =
    await sql`select * from passes where stripe_checkout_session_id = ${sessionId}`;
  return rows[0] ? rowToPass(rows[0]) : null;
}

// Idempotent pending -> paid, same contract as markBookingPaid.
export async function markPassPaid(
  id: string,
  stripeFeeCents: number,
): Promise<Pass | null> {
  const rows = await sql`
    update passes set payment_status = 'paid', stripe_fee_cents = ${stripeFeeCents}
    where id = ${id} and payment_status = 'pending'
    returning *
  `;
  return rows[0] ? rowToPass(rows[0]) : null;
}

export async function backfillPassStripeFee(
  id: string,
  stripeFeeCents: number,
): Promise<void> {
  await sql`
    update passes set stripe_fee_cents = ${stripeFeeCents}
    where id = ${id} and payment_status = 'paid' and stripe_fee_cents = 0
  `;
}

export async function deletePendingPass(id: string): Promise<void> {
  await sql`delete from passes where id = ${id} and payment_status = 'pending'`;
}

// A student's best redeemable pass with this teacher, matched by email.
// Booking auto-applies it: expiring-soonest first, then oldest.
export async function findRedeemablePass(
  teacherId: string,
  clientEmail: string,
): Promise<Pass | null> {
  const rows = await sql`
    select * from passes
    where teacher_id = ${teacherId}
      and lower(client_email) = ${clientEmail.toLowerCase()}
      and payment_status = 'paid'
    order by expires_at asc nulls last, created_at asc
  `;
  const now = new Date();
  for (const row of rows) {
    const pass = rowToPass(row);
    if (passIsRedeemable(pass, now)) return pass;
  }
  return null;
}

// Consume one credit. Guarded so a credit pass can never go negative; a race
// that would over-consume simply no-ops (returns false -> caller falls back
// to normal payment).
export async function redeemPassCredit(passId: string): Promise<boolean> {
  const rows = await sql`
    update passes set credits_used = credits_used + 1
    where id = ${passId}
      and payment_status = 'paid'
      and (credits_total is null or credits_used < credits_total)
    returning id
  `;
  return rows.length > 0;
}

export async function listPasses(teacherId: string): Promise<Pass[]> {
  const rows = await sql`
    select * from passes
    where teacher_id = ${teacherId} and payment_status = 'paid'
    order by created_at desc
  `;
  return rows.map(rowToPass);
}

// --- Payouts -----------------------------------------------------------------

export async function listPayouts(teacherId: string): Promise<Payout[]> {
  const rows = await sql`
    select * from payouts where teacher_id = ${teacherId} order by created_at desc
  `;
  return rows.map(rowToPayout);
}

export async function createPayout(
  teacherId: string,
  amountCents: number,
  note: string,
): Promise<Payout> {
  const id = newId("pay");
  const rows = await sql`
    insert into payouts (id, teacher_id, amount_cents, note)
    values (${id}, ${teacherId}, ${amountCents}, ${note})
    returning *
  `;
  return rowToPayout(rows[0]);
}

// --- Reviews -----------------------------------------------------------------

function rowToReview(row: Record<string, unknown>): Review {
  return {
    id: row.id as string,
    teacherId: row.teacher_id as string,
    authorName: row.author_name as string,
    rating: row.rating as number,
    body: row.body as string,
    source: (row.source as Review["source"]) ?? "manual",
    clientEmail: (row.client_email as string) ?? "",
    featured: row.featured as boolean,
    published: row.published as boolean,
    createdAt: toISO(row.created_at),
  };
}

// Featured first, then newest. `onlyPublished` filters to what the public sees;
// the dashboard passes false to manage hidden ones too.
export async function listReviews(
  teacherId: string,
  onlyPublished = false,
): Promise<Review[]> {
  const rows = onlyPublished
    ? await sql`
        select * from reviews
        where teacher_id = ${teacherId} and published = true
        order by featured desc, created_at desc
      `
    : await sql`
        select * from reviews
        where teacher_id = ${teacherId}
        order by featured desc, created_at desc
      `;
  return rows.map(rowToReview);
}

export async function getReviewStats(teacherId: string): Promise<ReviewStats> {
  const [row] = await sql`
    select coalesce(avg(rating), 0) as average, count(*) as count
    from reviews
    where teacher_id = ${teacherId} and published = true
  `;
  return { average: Number(row.average), count: Number(row.count) };
}

export async function createReview(
  teacherId: string,
  data: Pick<Review, "authorName" | "rating" | "body"> &
    Partial<Pick<Review, "source" | "clientEmail" | "featured">>,
): Promise<Review> {
  const id = newId("rev");
  const rating = Math.max(1, Math.min(5, Math.round(data.rating)));
  const rows = await sql`
    insert into reviews (id, teacher_id, author_name, rating, body, source, client_email, featured, published)
    values (${id}, ${teacherId}, ${data.authorName}, ${rating}, ${data.body},
            ${data.source ?? "manual"}, ${data.clientEmail ?? ""}, ${data.featured ?? false}, true)
    returning *
  `;
  return rowToReview(rows[0]);
}

export async function deleteReview(teacherId: string, id: string): Promise<void> {
  await sql`delete from reviews where id = ${id} and teacher_id = ${teacherId}`;
}

// Flip a single boolean flag (featured / published) with teacher-ownership guard.
export async function setReviewFlag(
  teacherId: string,
  id: string,
  flag: "featured" | "published",
  value: boolean,
): Promise<void> {
  if (flag === "featured") {
    await sql`update reviews set featured = ${value} where id = ${id} and teacher_id = ${teacherId}`;
  } else {
    await sql`update reviews set published = ${value} where id = ${id} and teacher_id = ${teacherId}`;
  }
}

// --- Cash-out requests -------------------------------------------------------

export async function setTeacherPayoutMethod(
  teacherId: string,
  method: PayoutMethod,
  handle: string,
): Promise<void> {
  await sql`
    update teachers set payout_method = ${method}, payout_handle = ${handle}
    where id = ${teacherId}
  `;
}

export async function getPendingPayoutRequest(
  teacherId: string,
): Promise<PayoutRequest | null> {
  const rows = await sql`
    select * from payout_requests
    where teacher_id = ${teacherId} and status = 'pending'
  `;
  return rows[0] ? rowToPayoutRequest(rows[0]) : null;
}

// Creates the request. A partial unique index allows only one pending request
// per teacher, so a double-submit races to a constraint error — callers treat
// that as "already requested", not a failure.
export async function createPayoutRequest(
  teacherId: string,
  amountCents: number,
  method: PayoutMethod,
  handle: string,
): Promise<PayoutRequest> {
  const id = newId("pyr");
  const rows = await sql`
    insert into payout_requests (id, teacher_id, amount_cents, method, handle, status)
    values (${id}, ${teacherId}, ${amountCents}, ${method}, ${handle}, 'pending')
    returning *
  `;
  return rowToPayoutRequest(rows[0]);
}

export interface PayoutRequestWithTeacher {
  request: PayoutRequest;
  teacherName: string;
  teacherEmail: string;
  teacherSlug: string;
}

// Every open cash-out request across all teachers — the founder's work queue.
export async function listPendingPayoutRequests(): Promise<
  PayoutRequestWithTeacher[]
> {
  const rows = await sql`
    select pr.*, t.name as teacher_name, t.email as teacher_email, t.slug as teacher_slug
    from payout_requests pr
    join teachers t on t.id = pr.teacher_id
    where pr.status = 'pending'
    order by pr.created_at
  `;
  return rows.map((row) => ({
    request: rowToPayoutRequest(row),
    teacherName: row.teacher_name as string,
    teacherEmail: row.teacher_email as string,
    teacherSlug: row.teacher_slug as string,
  }));
}

// Idempotent pending -> paid, same contract as markBookingPaid: only the call
// that actually makes the transition gets the request back (and goes on to
// record the payout + email the teacher); a repeat click returns null.
export async function markPayoutRequestPaid(
  requestId: string,
): Promise<PayoutRequest | null> {
  const rows = await sql`
    update payout_requests set status = 'paid', paid_at = now()
    where id = ${requestId} and status = 'pending'
    returning *
  `;
  if (!rows[0]) return null;
  const request = rowToPayoutRequest(rows[0]);

  const payout = await createPayout(
    request.teacherId,
    request.amountCents,
    `Cash-out via ${request.method} (${request.handle})`,
  );
  await sql`
    update payout_requests set payout_id = ${payout.id} where id = ${request.id}
  `;
  return { ...request, payoutId: payout.id };
}

// Net earnings per week for the mini chart: Monday-start UTC buckets, oldest
// first, zero-filled so every week renders. Bookings count in the week the
// class happens (clamped to now so prepaid future classes still show today);
// passes count in the week they were bought.
export interface WeeklyEarnings {
  weekStartISO: string;
  netCents: number;
}

export async function getWeeklyNetEarnings(
  teacherId: string,
  weeks = 8,
): Promise<WeeklyEarnings[]> {
  const bookingRows = await sql`
    select date_trunc('week', least(start_iso, now())) as week,
           coalesce(sum(price_cents - platform_fee_cents - stripe_fee_cents), 0) as net
    from bookings
    where teacher_id = ${teacherId} and payment_status = 'paid'
    group by 1
  `;
  const passRows = await sql`
    select date_trunc('week', created_at) as week,
           coalesce(sum(price_cents - platform_fee_cents - stripe_fee_cents), 0) as net
    from passes
    where teacher_id = ${teacherId} and payment_status = 'paid'
    group by 1
  `;

  const byWeek = new Map<string, number>();
  for (const row of [...bookingRows, ...passRows]) {
    const key = toISO(row.week).slice(0, 10);
    byWeek.set(key, (byWeek.get(key) ?? 0) + Number(row.net));
  }

  // Monday of the current UTC week (matches Postgres date_trunc('week')).
  const now = new Date();
  const daysSinceMonday = (now.getUTCDay() + 6) % 7;
  const monday = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysSinceMonday,
  );

  const series: WeeklyEarnings[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(monday - i * 7 * 24 * 60 * 60_000);
    const key = weekStart.toISOString().slice(0, 10);
    series.push({
      weekStartISO: weekStart.toISOString(),
      netCents: byWeek.get(key) ?? 0,
    });
  }
  return series;
}

export interface EarningsSummary {
  totalPaidCents: number; // gross: paid bookings + paid passes
  totalPlatformFeeCents: number;
  totalStripeFeeCents: number; // Stripe's actual processing fee, absorbed by the teacher
  totalPayoutCents: number;
  balanceCents: number; // what's still owed to the teacher
  // Activity stats
  uniqueStudents: number;
  classesBooked: number; // confirmed bookings, any payment type
  passesSold: number;
}

// A single person a teacher has done business with, aggregated across every
// booking and pass that shares an email. This is the CRM seed — built entirely
// from data we already have, no new capture step.
export interface AudienceMember {
  email: string;
  name: string;
  classesBooked: number; // confirmed, non-pending bookings
  passesBought: number; // paid passes
  totalSpentCents: number; // money that actually came from this person
  firstSeenISO: string;
  lastClassISO: string | null;
}

// Everyone who has booked a class or bought a pass with this teacher, grouped
// by email, "top fans" (most classes) first. Spend counts paid bookings +
// paid passes only — a pass-redeemed or free booking never double-counts the
// money (the pass purchase already did).
export async function getAudience(teacherId: string): Promise<AudienceMember[]> {
  const rows = await sql`
    with events as (
      select
        lower(client_email) as email,
        client_name as name,
        created_at,
        start_iso,
        price_cents,
        (status = 'confirmed' and payment_status <> 'pending') as is_class,
        (payment_status = 'paid') as is_paid_booking,
        false as is_pass
      from bookings
      where teacher_id = ${teacherId} and client_email <> ''
      union all
      select
        lower(client_email) as email,
        client_name as name,
        created_at,
        null::timestamptz as start_iso,
        price_cents,
        false as is_class,
        false as is_paid_booking,
        true as is_pass
      from passes
      where teacher_id = ${teacherId}
        and payment_status = 'paid'
        and client_email <> ''
    )
    select
      email,
      (array_agg(name order by created_at desc))[1] as name,
      count(*) filter (where is_class) as classes_booked,
      count(*) filter (where is_pass) as passes_bought,
      coalesce(sum(price_cents) filter (where is_paid_booking or is_pass), 0) as total_spent_cents,
      min(created_at) as first_seen,
      max(start_iso) filter (where is_class) as last_class
    from events
    group by email
    having count(*) filter (where is_class) > 0 or count(*) filter (where is_pass) > 0
    order by classes_booked desc, total_spent_cents desc, passes_bought desc, email
  `;
  return rows.map((row) => ({
    email: row.email as string,
    name: (row.name as string) || (row.email as string),
    classesBooked: Number(row.classes_booked),
    passesBought: Number(row.passes_bought),
    totalSpentCents: Number(row.total_spent_cents),
    firstSeenISO: toISO(row.first_seen),
    lastClassISO: row.last_class ? toISO(row.last_class) : null,
  }));
}

export async function getEarningsSummary(
  teacherId: string,
): Promise<EarningsSummary> {
  const [bookingRows] = await sql`
    select
      coalesce(sum(price_cents) filter (where payment_status = 'paid'), 0) as total_price,
      coalesce(sum(platform_fee_cents) filter (where payment_status = 'paid'), 0) as total_platform_fee,
      coalesce(sum(stripe_fee_cents) filter (where payment_status = 'paid'), 0) as total_stripe_fee,
      count(*) filter (where status = 'confirmed' and payment_status != 'pending') as classes_booked,
      count(distinct lower(client_email)) filter (where status = 'confirmed' and payment_status != 'pending') as unique_students
    from bookings
    where teacher_id = ${teacherId}
  `;
  const [passRows] = await sql`
    select
      coalesce(sum(price_cents), 0) as total_price,
      coalesce(sum(platform_fee_cents), 0) as total_platform_fee,
      coalesce(sum(stripe_fee_cents), 0) as total_stripe_fee,
      count(*) as passes_sold
    from passes
    where teacher_id = ${teacherId} and payment_status = 'paid'
  `;
  const [payoutRows] = await sql`
    select coalesce(sum(amount_cents), 0) as total_payout
    from payouts
    where teacher_id = ${teacherId}
  `;

  const totalPaidCents =
    Number(bookingRows.total_price) + Number(passRows.total_price);
  const totalPlatformFeeCents =
    Number(bookingRows.total_platform_fee) + Number(passRows.total_platform_fee);
  const totalStripeFeeCents =
    Number(bookingRows.total_stripe_fee) + Number(passRows.total_stripe_fee);
  const totalPayoutCents = Number(payoutRows.total_payout);
  const owedTotal = totalPaidCents - totalPlatformFeeCents - totalStripeFeeCents;

  return {
    totalPaidCents,
    totalPlatformFeeCents,
    totalStripeFeeCents,
    totalPayoutCents,
    balanceCents: owedTotal - totalPayoutCents,
    uniqueStudents: Number(bookingRows.unique_students),
    classesBooked: Number(bookingRows.classes_booked),
    passesSold: Number(passRows.passes_sold),
  };
}
