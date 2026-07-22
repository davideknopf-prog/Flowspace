import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getTeacherBySlug,
  getSessionType,
  listAvailability,
  listBookings,
  listClassEvents,
} from "@/lib/repo";
import { computeSlots } from "@/lib/slots";
import { computeOccurrences } from "@/lib/events";
import {
  formatDuration,
  formatPrice,
  formatDayHeading,
  formatTimeOnly,
} from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { BookingForm } from "@/components/BookingForm";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; sessionTypeId: string }>;
  searchParams: Promise<{ error?: string; start?: string }>;
}) {
  const { slug, sessionTypeId } = await params;
  const { error, start } = await searchParams;

  const teacher = await getTeacherBySlug(slug);
  if (!teacher) notFound();
  const sessionType = await getSessionType(sessionTypeId);
  if (!sessionType || sessionType.teacherId !== teacher.id) notFound();

  const flexible = sessionType.scheduling === "flexible";

  // Scheduled classes: this class's real occurrences (spots-aware). Legacy
  // fallback keeps availability-derived slots for teachers with no events yet.
  let slots: { startISO: string; spotsLeft: number | null }[] = [];
  if (!flexible) {
    const [events, bookings] = await Promise.all([
      listClassEvents(teacher.id),
      listBookings(teacher.id),
    ]);
    if (events.length > 0) {
      slots = computeOccurrences({
        now: new Date(),
        timeZone: teacher.timezone,
        events,
        sessionTypes: [sessionType],
        bookings,
        days: 21,
      }).filter((o) => o.spotsLeft !== 0);
    } else {
      const rules = await listAvailability(teacher.id);
      slots = computeSlots({
        now: new Date(),
        timeZone: teacher.timezone,
        durationMinutes: sessionType.durationMinutes,
        rules,
        bookings,
      }).map((s) => ({ startISO: s.startISO, spotsLeft: null }));
    }
  }

  // Group by day-in-teacher-timezone for a clean picker.
  const groups: {
    heading: string;
    slots: { startISO: string; label: string; spotsLeft: number | null }[];
  }[] = [];
  let currentHeading = "";
  for (const s of slots) {
    const heading = formatDayHeading(s.startISO, teacher.timezone);
    if (heading !== currentHeading) {
      groups.push({ heading, slots: [] });
      currentHeading = heading;
    }
    groups[groups.length - 1].slots.push({
      startISO: s.startISO,
      label: formatTimeOnly(s.startISO, teacher.timezone),
      spotsLeft: s.spotsLeft,
    });
  }

  // Arriving from a specific event carries ?start=… — honor it only if that
  // occurrence is still open, so a stale link degrades to the picker.
  const preselect =
    start && slots.some((s) => s.startISO === start) ? start : undefined;
  const staleStart = Boolean(!flexible && start && !preselect && slots.length > 0);

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link
          href={`/t/${teacher.slug}`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← Back to {teacher.name.split(" ")[0]}&apos;s page
        </Link>

        <div className="card mt-4 flex items-center gap-4">
          <Avatar name={teacher.name} src={teacher.avatarUrl} size={52} />
          <div>
            <h1 className="text-xl font-semibold">{sessionType.name}</h1>
            <p className="text-sm text-muted">
              with {teacher.name} · {formatDuration(sessionType.durationMinutes)} ·{" "}
              {formatPrice(sessionType.priceCents)}
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        {staleStart && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            That time was just taken — here are the next open times.
          </p>
        )}

        {!flexible && slots.length === 0 ? (
          <div className="card mt-6 text-center py-8 text-sm text-muted">
            No upcoming times for this class. Check back soon or reach out to{" "}
            {teacher.name.split(" ")[0]} directly.
          </div>
        ) : (
          <BookingForm
            slug={teacher.slug}
            sessionTypeId={sessionType.id}
            priceCents={sessionType.priceCents}
            timezone={teacher.timezone}
            groups={groups}
            preselect={preselect}
            flexible={flexible}
            teacherFirstName={teacher.name.split(" ")[0]}
          />
        )}
      </div>
    </main>
  );
}
