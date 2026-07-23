import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooterBar } from "@/components/SiteFooterBar";
import {
  listAllTeachers,
  listSessionTypes,
  listBookings,
  listClassEvents,
  getEarningsSummary,
  getWeeklyNetEarnings,
  getAudience,
  type AudienceMember,
} from "@/lib/repo";
import { computeOccurrences } from "@/lib/events";
import { formatSlot, formatMoney } from "@/lib/format";
import { Avatar } from "@/components/Avatar";

export const metadata: Metadata = {
  title: "See a live teacher dashboard — Kuleo",
  description:
    "Take a look inside a real Kuleo teacher's dashboard: earnings, upcoming classes, bookings, and audience. This is what running your yoga studio on Kuleo looks like.",
};

export const revalidate = 300;

// Pick the most demo-worthy teacher: prefer Maya, else the richest by
// audience then bookings. Keeps the showcase compelling as data changes.
async function pickDemoTeacher() {
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

export default async function DemoPage() {
  const teacher = await pickDemoTeacher();

  return (
    <main className="min-h-screen">
      <SiteHeader />

      {/* Demo banner */}
      <div className="bg-brand-dark text-white">
        <div className="mx-auto max-w-5xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            👀 <span className="font-semibold">Live example</span> — this is a real
            teacher&apos;s Kuleo dashboard. Yours could look like this by tonight.
          </p>
          <Link
            href="/signup"
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-brand-dark shrink-0"
          >
            Start your studio →
          </Link>
        </div>
      </div>

      {teacher ? (
        <DemoDashboard teacher={teacher} />
      ) : (
        <div className="mx-auto max-w-2xl px-4 py-20 text-center text-muted">
          Demo is warming up — check back shortly.
        </div>
      )}

      {/* Closing CTA */}
      <section className="mx-auto max-w-3xl px-4 py-14 text-center">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          This could be your studio.
        </h2>
        <p className="mt-3 text-muted">
          Set it up this afternoon — bookings, payments, and a page like this,
          all from one link. Zero commission on your classes.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup" className="btn-primary">
            Kick off your studio
          </Link>
          <Link href="/#pricing" className="btn-secondary">
            See pricing
          </Link>
        </div>
      </section>

      <SiteFooterBar />
    </main>
  );
}

async function DemoDashboard({
  teacher,
}: {
  teacher: Awaited<ReturnType<typeof listAllTeachers>>[number];
}) {
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

  const now = Date.now();
  const activeSessions = sessionTypes.filter((s) => s.active);
  const occurrences = computeOccurrences({
    now: new Date(),
    timeZone: teacher.timezone,
    events,
    sessionTypes: activeSessions,
    bookings,
    days: 14,
  }).filter((o) => o.spotsLeft !== 0);
  const sessionById = new Map(activeSessions.map((s) => [s.id, s]));

  const upcomingBookings = bookings
    .filter(
      (b) =>
        b.status === "confirmed" &&
        (!b.startISO || new Date(b.startISO).getTime() >= now),
    )
    .sort((a, b) => {
      const at = a.startISO ? new Date(a.startISO).getTime() : Infinity;
      const bt = b.startISO ? new Date(b.startISO).getTime() : Infinity;
      return at - bt;
    });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header — the teacher whose studio this is */}
      <div className="flex items-center gap-3">
        <Avatar name={teacher.name} src={teacher.avatarUrl} size={48} />
        <div>
          <h1 className="text-2xl font-semibold">{teacher.name}&apos;s studio</h1>
          <p className="text-muted text-sm">
            A live look at their Kuleo dashboard.
          </p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DemoKpi label="This week" value={formatMoney(thisWeekCents)} accent />
        <DemoKpi label="Ready to cash out" value={formatMoney(availableCents)} />
        <DemoKpi
          label={audience.length === 1 ? "Student" : "Students"}
          value={String(audience.length)}
        />
        <DemoKpi label="Upcoming classes" value={String(occurrences.length)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Earnings */}
        <div className="card">
          <h2 className="font-semibold mb-3">Earnings</h2>
          <p className="text-3xl font-semibold [font-family:var(--font-display)]">
            {formatMoney(earnedCents)}
            <span className="text-sm font-normal text-muted [font-family:var(--font-sans)]">
              {" "}earned all-time
            </span>
          </p>
          <div className="mt-3 flex items-end gap-1 h-12">
            {weekly.map((w, i) => {
              const max = Math.max(1, ...weekly.map((x) => x.netCents));
              const pct = Math.round((w.netCents / max) * 100);
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-brand/70"
                  style={{ height: `${Math.max(3, pct)}%` }}
                />
              );
            })}
          </div>
          <p className="text-xs text-muted mt-2">Net, last 8 weeks</p>
        </div>

        {/* Upcoming classes */}
        <div className="card">
          <h2 className="font-semibold mb-3">Upcoming classes</h2>
          {occurrences.length === 0 ? (
            <p className="text-sm text-muted">No scheduled classes right now.</p>
          ) : (
            <ul className="space-y-2">
              {occurrences.slice(0, 4).map((o) => {
                const s = sessionById.get(o.sessionTypeId);
                if (!s) return null;
                return (
                  <li
                    key={`${o.sessionTypeId}-${o.startISO}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium truncate">{s.name}</span>
                    <span className="text-muted shrink-0 pl-2">
                      {formatSlot(o.startISO, teacher.timezone)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Upcoming bookings */}
        <div className="card">
          <h2 className="font-semibold mb-3">Upcoming bookings</h2>
          {upcomingBookings.length === 0 ? (
            <p className="text-sm text-muted">No upcoming bookings right now.</p>
          ) : (
            <ul className="space-y-2">
              {upcomingBookings.slice(0, 4).map((b) => (
                <li key={b.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate">{b.clientName}</span>
                  <span className="text-muted shrink-0 pl-2">
                    {formatSlot(b.startISO, teacher.timezone)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Audience */}
        <div className="card">
          <h2 className="font-semibold mb-3">Audience</h2>
          {audience.length === 0 ? (
            <p className="text-sm text-muted">No students yet.</p>
          ) : (
            <ul className="space-y-2">
              {audience.slice(0, 4).map((m: AudienceMember) => (
                <li key={m.email} className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate">{m.name}</span>
                  <span className="text-muted shrink-0 pl-2">
                    {m.classesBooked} class{m.classesBooked === 1 ? "" : "es"} ·{" "}
                    {formatMoney(m.totalSpentCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function DemoKpi({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`card !p-4 ${accent ? "border-brand bg-brand-tint/40" : ""}`}>
      <p className="text-xs text-muted">{label}</p>
      <p
        className={`text-2xl font-semibold mt-1 [font-family:var(--font-display)] ${
          accent ? "text-brand-dark" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
