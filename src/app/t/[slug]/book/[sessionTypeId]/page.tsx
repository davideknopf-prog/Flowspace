import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getTeacherBySlug,
  getSessionType,
  listAvailability,
  listBookings,
  listClassEvents,
  listOffers,
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

  // Demo/showcase profile: intercept before the form so no one fills it out
  // only to be bounced. The public page still looks fully real.
  if (teacher.isDemo) {
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
          <div className="card mt-6 text-center py-10">
            <p className="text-3xl mb-3">✨</p>
            <h2 className="text-lg font-semibold">This is a sample studio</h2>
            <p className="mt-2 text-sm text-muted max-w-sm mx-auto">
              {teacher.name.split(" ")[0]} is a demo profile showing what a
              teacher&apos;s Kuleo page looks like. Booking is turned off here —
              but this is exactly what your students would see and use.
            </p>
            <Link href="/signup" className="btn-primary mt-6 inline-flex">
              Start your own studio →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const flexible = sessionType.scheduling === "flexible";

  // Pass upsell: if the teacher sells a pass whose per-class price beats this
  // class, nudge the student toward it (recurring revenue for the teacher,
  // savings for the student). Also surface an unlimited pass as a nudge.
  const offers = (await listOffers(teacher.id)).filter((o) => o.active);
  const passNudge = (() => {
    if (sessionType.priceCents <= 0) return null;
    let best: { label: string; sub: string } | null = null;
    let bestPer = sessionType.priceCents;
    for (const o of offers) {
      if (o.creditCount && o.creditCount > 1) {
        const per = Math.round(o.priceCents / o.creditCount);
        if (per < bestPer) {
          bestPer = per;
          best = {
            label: `Save with the ${o.name}`,
            sub: `${o.creditCount} classes for ${formatPrice(o.priceCents)} — that's ${formatPrice(per)}/class vs ${formatPrice(sessionType.priceCents)}.`,
          };
        }
      }
    }
    if (best) return best;
    const unlimited = offers.find((o) => o.creditCount == null);
    if (unlimited) {
      return {
        label: `Practicing a lot? Go unlimited`,
        sub: `${unlimited.name} — ${formatPrice(unlimited.priceCents)}${unlimited.validDays ? ` for ${unlimited.validDays} days` : ""} of classes.`,
      };
    }
    return null;
  })();

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

        {/* Description carried from the class */}
        {sessionType.description && (
          <p className="mt-3 text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
            {sessionType.description}
          </p>
        )}

        {/* Recurring-revenue nudge: a pass beats paying per class */}
        {passNudge && (
          <Link
            href={`/t/${teacher.slug}#passes`}
            className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-brand bg-brand-tint/50 px-4 py-3 hover:bg-brand-tint transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-dark">✨ {passNudge.label}</p>
              <p className="text-xs text-muted">{passNudge.sub}</p>
            </div>
            <span className="text-sm text-brand-dark font-medium shrink-0">See passes →</span>
          </Link>
        )}

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
