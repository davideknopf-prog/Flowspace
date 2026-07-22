import {
  listAllTeachers,
  listSessionTypes,
  listAvailability,
  listBookings,
} from "@/lib/repo";
import { computeSlots } from "@/lib/slots";
import { formatDayHeading, formatTimeOnly } from "@/lib/format";
import type { Teacher } from "@/lib/types";

// One "studio front desk" view of the whole platform: every teacher's next
// bookable openings merged chronologically. Shared by the public schedule
// page and the students page.

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
      const [sessions, rules, bookings] = await Promise.all([
        listSessionTypes(t.id),
        listAvailability(t.id),
        listBookings(t.id),
      ]);
      const active = sessions.filter((s) => s.active);
      const entries: StudioEntry[] = [];
      for (const s of active) {
        const slots = computeSlots({
          now,
          timeZone: t.timezone,
          durationMinutes: s.durationMinutes,
          rules,
          bookings,
          days: 7,
        });
        // A class type's next few openings, not every slot — keeps the
        // schedule a readable "what's coming up" not a wall of buttons.
        for (const slot of slots.slice(0, 3)) {
          entries.push({
            startISO: slot.startISO,
            timeLabel:
              formatTimeOnly(slot.startISO, t.timezone) +
              ` (${shortTz(t.timezone)})`,
            dayHeading: formatDayHeading(slot.startISO, t.timezone),
            teacherName: t.name,
            teacherSlug: t.slug,
            teacherAvatar: t.avatarUrl,
            className: s.name,
            durationMinutes: s.durationMinutes,
            priceCents: s.priceCents,
            locationType: s.locationType,
            bookHref: `/t/${t.slug}/book/${s.id}?start=${encodeURIComponent(slot.startISO)}`,
          });
        }
      }
      return entries;
    }),
  );

  // A teacher's class types all draw from the same availability, so the same
  // opening can appear once per class type — which reads as one person
  // teaching three classes at 9:00. Keep at most ONE entry per teacher per
  // hour block; rotate which class type wins so variety still shows through.
  const perTeacherHour = new Set<string>();
  const entries = nested
    .flat()
    .sort((a, b) => a.startISO.localeCompare(b.startISO))
    .filter((e) => {
      const hour = new Date(e.startISO);
      hour.setUTCMinutes(0, 0, 0);
      const key = `${e.teacherSlug}|${hour.toISOString()}`;
      if (perTeacherHour.has(key)) return false;
      perTeacherHour.add(key);
      return true;
    })
    .slice(0, limit);

  return { entries, teachers };
}
