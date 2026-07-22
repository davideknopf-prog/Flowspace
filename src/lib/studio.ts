import {
  listAllTeachers,
  listSessionTypes,
  listClassEvents,
  listAvailability,
  listBookings,
} from "@/lib/repo";
import { computeOccurrences } from "@/lib/events";
import { computeUpcomingClasses } from "@/lib/slots";
import { formatDayHeading, formatTimeOnly } from "@/lib/format";
import type { Teacher } from "@/lib/types";

// One "studio front desk" view of the whole platform: every teacher's
// scheduled classes merged chronologically. Shared by the public schedule
// page, the students page, and the landing strip.

export interface StudioEntry {
  startISO: string;
  timeLabel: string;
  dayHeading: string;
  teacherName: string;
  teacherSlug: string;
  teacherAvatar: string;
  className: string;
  durationMinutes: number;
  priceCents: number;
  locationType: string;
  bookHref: string;
  // null = unlimited seats; 0 = full (already filtered out of listings).
  spotsLeft: number | null;
}

export function shortTz(tz: string): string {
  const map: Record<string, string> = {
    "America/New_York": "ET",
    "America/Chicago": "CT",
    "America/Denver": "MT",
    "America/Los_Angeles": "PT",
  };
  return map[tz] ?? tz.split("/").pop()?.replace("_", " ") ?? tz;
}

export async function getStudioSchedule(limit = 40): Promise<{
  entries: StudioEntry[];
  teachers: Teacher[];
}> {
  const teachers = await listAllTeachers();
  const now = new Date();

  const nested = await Promise.all(
    teachers.map(async (t) => {
      const [sessions, events, bookings] = await Promise.all([
        listSessionTypes(t.id),
        listClassEvents(t.id),
        listBookings(t.id),
      ]);
      const active = sessions.filter((s) => s.active);

      // The real thing: scheduled occurrences of this teacher's classes.
      let occurrences = computeOccurrences({
        now,
        timeZone: t.timezone,
        events,
        sessionTypes: active,
        bookings,
        days: 7,
      }).filter((o) => o.spotsLeft !== 0);

      // Legacy fallback: a teacher who hasn't scheduled events yet (pre-
      // conversion) still shows availability-derived openings so their page
      // never goes dark. Remove once every teacher runs on events.
      if (occurrences.length === 0 && events.length === 0) {
        const rules = await listAvailability(t.id);
        const eventsMode = active.filter((s) => s.scheduling === "events");
        occurrences = computeUpcomingClasses({
          now,
          timeZone: t.timezone,
          rules,
          bookings,
          sessionTypes: eventsMode,
          limit: 6,
          days: 7,
        }).map((u) => ({
          startISO: u.startISO,
          sessionTypeId: u.sessionTypeId,
          eventId: "",
          capacity: null,
          spotsLeft: null,
        }));
      }

      const byId = new Map(active.map((s) => [s.id, s]));
      return occurrences.slice(0, 6).flatMap((o) => {
        const s = byId.get(o.sessionTypeId);
        if (!s) return [];
        return [
          {
            startISO: o.startISO,
            timeLabel:
              formatTimeOnly(o.startISO, t.timezone) + ` (${shortTz(t.timezone)})`,
            dayHeading: formatDayHeading(o.startISO, t.timezone),
            teacherName: t.name,
            teacherSlug: t.slug,
            teacherAvatar: t.avatarUrl,
            className: s.name,
            durationMinutes: s.durationMinutes,
            priceCents: s.priceCents,
            locationType: s.locationType,
            bookHref: `/t/${t.slug}/book/${s.id}?start=${encodeURIComponent(o.startISO)}`,
            spotsLeft: o.spotsLeft,
          } satisfies StudioEntry,
        ];
      });
    }),
  );

  const entries = nested
    .flat()
    .sort((a, b) => a.startISO.localeCompare(b.startISO))
    .slice(0, limit);

  return { entries, teachers };
}
