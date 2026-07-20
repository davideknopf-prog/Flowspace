import { sql } from "./sql";
import { newId, slugify } from "./db";
import type {
  Teacher,
  SessionType,
  AvailabilityRule,
  Booking,
  Payout,
} from "./types";

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
    createdAt: toISO(row.created_at),
    clerkUserId: (row.clerk_user_id as string | null) ?? null,
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

// --- Teachers ------------------------------------------------------------

export async function getTeacherById(id: string): Promise<Teacher | null> {
  const rows = await sql`select * from teachers where id = ${id}`;
  return rows[0] ? rowToTeacher(rows[0]) : null;
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
      timezone = ${merged.timezone}
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
       payment_status, status, stripe_checkout_session_id, platform_fee_cents)
    values
      (${id}, ${data.teacherId}, ${data.sessionTypeId}, ${data.clientName}, ${data.clientEmail}, ${data.note}, ${data.startISO},
       ${data.durationMinutes}, ${data.priceCents}, ${data.locationType}, ${data.meetingUrl}, ${data.locationNote},
       ${data.paymentStatus}, 'confirmed', ${data.stripeCheckoutSessionId}, ${data.platformFeeCents})
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

export interface EarningsSummary {
  totalPaidCents: number; // gross, what students paid
  totalPlatformFeeCents: number;
  totalStripeFeeCents: number; // Stripe's actual processing fee, absorbed by the teacher
  totalPayoutCents: number;
  balanceCents: number; // what's still owed to the teacher
}

export async function getEarningsSummary(
  teacherId: string,
): Promise<EarningsSummary> {
  const [bookingRows] = await sql`
    select
      coalesce(sum(price_cents), 0) as total_price,
      coalesce(sum(platform_fee_cents), 0) as total_platform_fee,
      coalesce(sum(stripe_fee_cents), 0) as total_stripe_fee
    from bookings
    where teacher_id = ${teacherId} and payment_status = 'paid'
  `;
  const [payoutRows] = await sql`
    select coalesce(sum(amount_cents), 0) as total_payout
    from payouts
    where teacher_id = ${teacherId}
  `;

  const totalPaidCents = Number(bookingRows.total_price);
  const totalPlatformFeeCents = Number(bookingRows.total_platform_fee);
  const totalStripeFeeCents = Number(bookingRows.total_stripe_fee);
  const totalPayoutCents = Number(payoutRows.total_payout);
  const owedTotal = totalPaidCents - totalPlatformFeeCents - totalStripeFeeCents;

  return {
    totalPaidCents,
    totalPlatformFeeCents,
    totalStripeFeeCents,
    totalPayoutCents,
    balanceCents: owedTotal - totalPayoutCents,
  };
}
