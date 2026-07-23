import {
  listAllTeachers,
  listSessionTypes,
  listBookings,
  listClassEvents,
  getEarningsSummary,
  getWeeklyNetEarnings,
  getAudience,
} from "@/lib/repo";
import { computeOccurrences } from "@/lib/events";
import type { Teacher } from "@/lib/types";

// Pick the most demo-worthy teacher: prefer Maya, else richest by audience
// then bookings. Shared by /demo and the home-page embed.
export async function pickDemoTeacher(): Promise<Teacher | null> {
  const teachers = await listAllTeachers();
  if (teachers.length === 0) return null;
  const scored = await Promise.all(
    teachers.map(async (t) => {
      const [bookings, audience] = await Promise.all([
        listBookings(t.id),
        getAudience(t.id),
      ]);
      const preferred = t.slug === "maya-chen" ? 1000 : 0;
      return { t, score: preferred + audience.length * 10 + bookings.length };
    }),
  );
  scored.sort((a, b) => b.score - a.score);
  return scored[0].t;
}

export interface DemoSnapshot {
  teacher: Teacher;
  thisWeekCents: number;
  earnedCents: number;
  availableCents: number;
  studentCount: number;
  passHolders: number;
  upcomingCount: number;
  weekly: { netCents: number }[];
}

// Compact, read-only metrics for a teacher — the numbers shown on /demo and
// the home embed.
export async function getDemoSnapshot(
  teacher: Teacher,
): Promise<DemoSnapshot> {
  const [sessionTypes, bookings, events, summary, weekly, audience] =
    await Promise.all([
      listSessionTypes(teacher.id),
      listBookings(teacher.id),
      listClassEvents(teacher.id),
      getEarningsSummary(teacher.id),
      getWeeklyNetEarnings(teacher.id, 8),
      getAudience(teacher.id),
    ]);

  const earnedCents =
    summary.totalPaidCents -
    summary.totalPlatformFeeCents -
    summary.totalStripeFeeCents;
  const availableCents = Math.max(0, summary.balanceCents);
  const thisWeekCents = weekly[weekly.length - 1]?.netCents ?? 0;

  const now = new Date();
  const active = sessionTypes.filter((s) => s.active);
  const upcoming = computeOccurrences({
    now,
    timeZone: teacher.timezone,
    events,
    sessionTypes: active,
    bookings,
    days: 14,
  }).filter((o) => o.spotsLeft !== 0);

  return {
    teacher,
    thisWeekCents,
    earnedCents,
    availableCents,
    studentCount: audience.length,
    passHolders: audience.filter((m) => m.passesBought > 0).length,
    upcomingCount: upcoming.length,
    weekly: weekly.map((w) => ({ netCents: w.netCents })),
  };
}
