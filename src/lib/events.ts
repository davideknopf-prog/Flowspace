import type { Booking, ClassEvent, SessionType } from "./types";

// -----------------------------------------------------------------------------
// Turning class events into concrete occurrences ("Vinyasa — Tue Jul 28,
// 6:00 PM, 4 of 12 spots left"). This replaces availability-grid slot
// generation: a class happens when the teacher scheduled it, full stop.
// -----------------------------------------------------------------------------

// Offset (ms) of `timeZone` from UTC at the given instant.
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

function zonedWallToUtc(
  year: number,
  month: number,
  day: number,
  minutes: number,
  timeZone: string,
): Date {
  const naiveUtc = Date.UTC(year, month - 1, day) + minutes * 60_000;
  const offset = tzOffsetMs(new Date(naiveUtc), timeZone);
  return new Date(naiveUtc - offset);
}

function zonedWeekday(instant: Date, timeZone: string): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(instant);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
}

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

export interface Occurrence {
  startISO: string;
  sessionTypeId: string;
  eventId: string;
  // null = unlimited. When set, spotsLeft is capacity minus active bookings.
  capacity: number | null;
  spotsLeft: number | null;
}

/**
 * Concrete upcoming occurrences for a teacher's active event-mode classes.
 * - Weekly events expand over the next `days` days in the teacher's timezone.
 * - One-off events appear if still in the future.
 * - Occurrences already holding `capacity` active bookings are marked full
 *   (spotsLeft = 0) but still returned — callers choose to show or hide.
 */
export function computeOccurrences(params: {
  now: Date;
  timeZone: string;
  events: ClassEvent[];
  sessionTypes: SessionType[];
  bookings: Booking[];
  days?: number;
  leadMinutes?: number;
}): Occurrence[] {
  const {
    now,
    timeZone,
    events,
    sessionTypes,
    bookings,
    days = 14,
    leadMinutes = 60,
  } = params;

  const byId = new Map(sessionTypes.map((s) => [s.id, s]));
  const earliest = now.getTime() + leadMinutes * 60_000;

  // Seats taken per (sessionType, start): confirmed bookings plus pending
  // ones (a pending Stripe checkout holds its seat until it expires).
  const taken = new Map<string, number>();
  for (const b of bookings) {
    if (b.status !== "confirmed" || !b.startISO) continue;
    const key = `${b.sessionTypeId}|${new Date(b.startISO).getTime()}`;
    taken.set(key, (taken.get(key) ?? 0) + 1);
  }

  const out: Occurrence[] = [];

  for (const ev of events) {
    if (!ev.active) continue;
    const st = byId.get(ev.sessionTypeId);
    if (!st || !st.active || st.scheduling !== "events") continue;

    const starts: Date[] = [];
    if (ev.kind === "once") {
      if (ev.startAt) starts.push(new Date(ev.startAt));
    } else if (ev.weekday != null && ev.startMinutes != null) {
      for (let d = 0; d < days; d++) {
        const dayInstant = new Date(now.getTime() + d * 24 * 60 * 60_000);
        if (zonedWeekday(dayInstant, timeZone) !== ev.weekday) continue;
        const { year, month, day } = zonedYMD(dayInstant, timeZone);
        starts.push(zonedWallToUtc(year, month, day, ev.startMinutes, timeZone));
      }
    }

    for (const start of starts) {
      if (start.getTime() < earliest) continue;
      const key = `${st.id}|${start.getTime()}`;
      const used = taken.get(key) ?? 0;
      out.push({
        startISO: start.toISOString(),
        sessionTypeId: st.id,
        eventId: ev.id,
        capacity: st.capacity,
        spotsLeft: st.capacity == null ? null : Math.max(0, st.capacity - used),
      });
    }
  }

  out.sort((a, b) => a.startISO.localeCompare(b.startISO));
  return out;
}

const WEEKDAY_NAMES = [
  "Sundays",
  "Mondays",
  "Tuesdays",
  "Wednesdays",
  "Thursdays",
  "Fridays",
  "Saturdays",
];

// "Tuesdays · 6:00 PM" — a weekly event's human schedule line.
export function describeEvent(ev: ClassEvent, timeZone: string): string {
  if (ev.kind === "once" && ev.startAt) {
    return new Date(ev.startAt).toLocaleString("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (ev.weekday == null || ev.startMinutes == null) return "";
  const h = Math.floor(ev.startMinutes / 60);
  const m = ev.startMinutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${WEEKDAY_NAMES[ev.weekday]} · ${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}
