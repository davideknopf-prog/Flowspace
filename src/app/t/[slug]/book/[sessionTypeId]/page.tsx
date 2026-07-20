import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getTeacherBySlug,
  getSessionType,
  listAvailability,
  listBookings,
} from "@/lib/repo";
import { computeSlots } from "@/lib/slots";
import { formatDuration, formatPrice, formatDayHeading, formatTimeOnly } from "@/lib/format";
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

  const [rules, bookings] = await Promise.all([
    listAvailability(teacher.id),
    listBookings(teacher.id),
  ]);

  const slots = computeSlots({
    now: new Date(),
    timeZone: teacher.timezone,
    durationMinutes: sessionType.durationMinutes,
    rules,
    bookings,
  });

  // Group slots by day-in-teacher-timezone for a clean picker.
  const groups: { heading: string; slots: { startISO: string; label: string }[] }[] = [];
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
    });
  }

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

        {slots.length === 0 ? (
          <div className="card mt-6 text-center py-8 text-sm text-muted">
            No open times in the next two weeks. Check back soon or reach out to{" "}
            {teacher.name.split(" ")[0]} directly.
          </div>
        ) : (
          <BookingForm
            slug={teacher.slug}
            sessionTypeId={sessionType.id}
            priceCents={sessionType.priceCents}
            timezone={teacher.timezone}
            groups={groups}
            preselect={start}
          />
        )}
      </div>
    </main>
  );
}
