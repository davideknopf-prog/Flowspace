import Link from "next/link";
import type { Metadata } from "next";
import {
  listAllTeachers,
  listSessionTypes,
  listAvailability,
  listBookings,
} from "@/lib/repo";
import { computeSlots } from "@/lib/slots";
import { Avatar } from "@/components/Avatar";
import { formatPrice, formatDuration, formatDayHeading, formatTimeOnly } from "@/lib/format";

export const metadata: Metadata = {
  title: "Studio schedule — Kuleo",
  description: "Every upcoming class from every Kuleo teacher, in one schedule.",
};

// One studio front desk for the whole platform: merge every teacher's next
// bookable slots into a single chronological schedule. (When event-based
// classes land, this page keeps its URL and simply gets better data.)
export const revalidate = 300; // cache for 5 min — this fans out per teacher

interface Entry {
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

export default async function StudioSchedulePage() {
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
      const entries: Entry[] = [];
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
            timeLabel: formatTimeOnly(slot.startISO, t.timezone) + ` (${shortTz(t.timezone)})`,
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

  const entries = nested
    .flat()
    .sort((a, b) => a.startISO.localeCompare(b.startISO))
    .slice(0, 40);

  // Group chronologically by day heading.
  const groups: { heading: string; items: Entry[] }[] = [];
  for (const e of entries) {
    const last = groups[groups.length - 1];
    if (last && last.heading === e.dayHeading) last.items.push(e);
    else groups.push({ heading: e.dayHeading, items: [e] });
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-brand-dark">
            <span className="text-xl">🧘</span> Kuleo
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/teachers" className="btn-ghost text-sm">
              Teachers
            </Link>
            <Link href="/signup" className="btn-primary text-sm">
              Teach on Kuleo
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Studio schedule</h1>
          <p className="text-muted">
            Upcoming classes from every Kuleo teacher — pick one and book.
            Times shown in each teacher&apos;s local timezone.
          </p>
        </div>

        {groups.length === 0 ? (
          <div className="card text-center py-10 text-muted">
            No upcoming classes this week — check back soon.
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((g) => (
              <section key={g.heading}>
                <h2 className="text-sm font-semibold text-muted mb-3">{g.heading}</h2>
                <ul className="space-y-2">
                  {g.items.map((e, i) => (
                    <li key={e.bookHref + i}>
                      <Link
                        href={e.bookHref}
                        className="card !p-4 flex items-center gap-4 hover:border-brand transition-colors"
                      >
                        <div className="w-24 shrink-0 text-sm font-semibold">
                          {e.timeLabel}
                        </div>
                        <Avatar name={e.teacherName} src={e.teacherAvatar} size={40} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">
                            {e.className}{" "}
                            <span className="text-muted font-normal">
                              · {e.teacherName}
                            </span>
                          </p>
                          <p className="text-xs text-muted">
                            {formatDuration(e.durationMinutes)} ·{" "}
                            {e.locationType === "online" ? "💻 Online" : "📍 In person"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold">{formatPrice(e.priceCents)}</p>
                          <span className="text-xs text-brand-dark">Book →</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function shortTz(tz: string): string {
  const map: Record<string, string> = {
    "America/New_York": "ET",
    "America/Chicago": "CT",
    "America/Denver": "MT",
    "America/Los_Angeles": "PT",
  };
  return map[tz] ?? tz.split("/").pop()?.replace("_", " ") ?? tz;
}
