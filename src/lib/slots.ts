import type { AvailabilityRule, Booking } from "./types";

// -----------------------------------------------------------------------------
// Turning weekly availability rules into concrete, bookable time slots.
//
// The subtle part is timezones: a teacher's "Tuesday 9:00am" is wall-clock time
// in *their* timezone, but we store and compare bookings in absolute UTC. We do
// the conversion with Intl (no external date library) so this stays dependency
// free until we decide otherwise.
// -----------------------------------------------------------------------------

// Offset (ms) of `timeZone` from UTC at the given instant. Positive = ahead of UTC.
function tzOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(instant);
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  const asUTC = Date.UTC(
    map.year,
    map.month - 1,
    map.day,
    map.hour === 24 ? 0 : map.hour,
    map.minute,
    map.second,
  );
  return asUTC - instant.getTime();
}

// Convert a wall-clock time (Y/M/D + minutes-from-midnight) in `timeZone` to a
// real UTC Date.
function zonedWallToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  minutes: number,
  timeZone: string,
): Date {
  const naiveUtc = Date.UTC(year, month - 1, day) + minutes * 60_000;
  const offset = tzOffsetMs(new Date(naiveUtc), timeZone);
  return new Date(naiveUtc - offset);
}

// The calendar weekday (0=Sun..6=Sat) of an instant, as seen in `timeZone`.
function zonedWeekday(instant: Date, timeZone: string): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(instant);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
}

// The Y/M/D in `timeZone` for an instant.
function zonedYMD(
  instant: Date,
  timeZone: string,
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  return { year: map.year, month: map.month, day: map.day };
}

export interface Slot {
  startISO: string;
  endISO: string;
}

function overlaps(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Compute bookable slots over the next `days` days.
 * - Steps through each availability window in `durationMinutes` increments.
 * - Drops slots in the past (with a small lead-time buffer).
 * - Drops slots that collide with an existing confirmed booking.
 */
export function computeSlots(params: {
  now: Date;
  timeZone: string;
  durationMinutes: number;
  rules: AvailabilityRule[];
  bookings: Booking[];
  days?: number;
  leadMinutes?: number;
}): Slot[] {
  const {
    now,
    timeZone,
    durationMinutes,
    rules,
    bookings,
    days = 14,
    leadMinutes = 120,
  } = params;

  if (durationMinutes <= 0 || rules.length === 0) return [];

  const earliest = now.getTime() + leadMinutes * 60_000;
  const busy = bookings
    .filter((b) => b.status === "confirmed")
    .map((b) => {
      const start = new Date(b.startISO).getTime();
      return { start, end: start + b.durationMinutes * 60_000 };
    });

  const slots: Slot[] = [];

  for (let d = 0; d < days; d++) {
    const dayInstant = new Date(now.getTime() + d * 24 * 60 * 60_000);
    const weekday = zonedWeekday(dayInstant, timeZone);
    const { year, month, day } = zonedYMD(dayInstant, timeZone);

    const dayRules = rules.filter((r) => r.weekday === weekday);
    for (const rule of dayRules) {
      for (
        let m = rule.startMinutes;
        m + durationMinutes <= rule.endMinutes;
        m += durationMinutes
      ) {
        const start = zonedWallToUtc(year, month, day, m, timeZone);
        const startMs = start.getTime();
        const endMs = startMs + durationMinutes * 60_000;

        if (startMs < earliest) continue;
        if (busy.some((b) => overlaps(startMs, endMs, b.start, b.end))) continue;

        slots.push({
          startISO: new Date(startMs).toISOString(),
          endISO: new Date(endMs).toISOString(),
        });
      }
    }
  }

  slots.sort((a, b) => a.startISO.localeCompare(b.startISO));
  return slots;
}

// One soonest-first bookable opening, tagged with the session it's for. This is
// the "upcoming classes" interim (pre real scheduled events): we don't have
// class instances yet, so we surface the next open times derived from
// availability, each a one-tap path into the booking flow.
export interface UpcomingClass {
  startISO: string;
  endISO: string;
  sessionTypeId: string;
}

// Merge each active session type's next slots into a single chronological list,
// capped to the soonest `limit`. Different session types have different
// durations, so their grids differ; a shared start time across two types is
// kept (they're genuinely two different classes to choose from).
export function computeUpcomingClasses(params: {
  now: Date;
  timeZone: string;
  rules: AvailabilityRule[];
  bookings: Booking[];
  sessionTypes: Array<{ id: string; durationMinutes: number }>;
  limit?: number;
  days?: number;
}): UpcomingClass[] {
  const { now, timeZone, rules, bookings, sessionTypes, limit = 6, days = 14 } =
    params;
  if (rules.length === 0 || sessionTypes.length === 0) return [];

  const all: UpcomingClass[] = [];
  for (const st of sessionTypes) {
    const slots = computeSlots({
      now,
      timeZone,
      durationMinutes: st.durationMinutes,
      rules,
      bookings,
      days,
    });
    for (const s of slots) {
      all.push({ startISO: s.startISO, endISO: s.endISO, sessionTypeId: st.id });
    }
  }
  all.sort((a, b) => a.startISO.localeCompare(b.startISO));
  return all.slice(0, limit);
}
