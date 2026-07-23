import Link from "next/link";
import { getViewerContext } from "@/lib/session";
import { redirect } from "next/navigation";
import {
  listSessionTypes,
  listAvailability,
  listBookings,
  listClassEvents,
  listAllTeachers,
  listPendingPayoutRequests,
  getEarningsSummary,
  getWeeklyNetEarnings,
  getAudience,
} from "@/lib/repo";
import { computeOccurrences } from "@/lib/events";
import { CopyLink } from "@/components/CopyLink";
import { formatSlot, formatMoney } from "@/lib/format";
import { payoutMethodLabel } from "@/lib/types";
import { headers } from "next/headers";
import { FOUNDER } from "@/lib/founder";
import { viewAsAction, markPayoutRequestPaidAction } from "./actions";

export default async function DashboardHome() {
  const ctx = await getViewerContext();
  if (!ctx) redirect("/login");
  const { teacher, isFounderViewer, impersonating } = ctx;
  const showOperatorTools = isFounderViewer && !impersonating;
  const [otherTeachers, cashOutQueue] = showOperatorTools
    ? await Promise.all([
        listAllTeachers().then((all) => all.filter((t) => t.id !== teacher.id)),
        listPendingPayoutRequests(),
      ])
    : [[], []];

  const [sessionTypes, availability, bookings, events, summary, weekly, audience] =
    await Promise.all([
      listSessionTypes(teacher.id),
      listAvailability(teacher.id),
      listBookings(teacher.id),
      listClassEvents(teacher.id),
      getEarningsSummary(teacher.id),
      getWeeklyNetEarnings(teacher.id, 8),
      getAudience(teacher.id),
    ]);

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const publicUrl = `${proto}://${host}/t/${teacher.slug}`;

  // --- KPIs — the eyes-on-the-prize numbers ---------------------------------
  const earnedCents =
    summary.totalPaidCents - summary.totalPlatformFeeCents;
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

  // --- Setup checklist ------------------------------------------------------
  const steps = [
    { done: teacher.bio.trim().length > 0, label: "Complete your profile", href: "/dashboard/profile" },
    { done: sessionTypes.length > 0, label: "Add a class & price", href: "/dashboard/schedule" },
    {
      done:
        events.length > 0 ||
        availability.length > 0 ||
        (sessionTypes.length > 0 && sessionTypes.every((s) => s.scheduling === "flexible")),
      label: "Schedule your class times",
      href: "/dashboard/schedule",
    },
    { done: bookings.length > 0, label: "Share your link & get your first booking", href: "#share-link" },
  ];
  const remaining = steps.filter((s) => !s.done).length;
  const setupDone = steps.slice(0, 3).every((s) => s.done);
  const ready = remaining === 0;
  const firstName = teacher.name.split(" ")[0];

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Welcome back, {firstName} 👋</h1>
          <p className="text-muted text-sm">Your studio at a glance.</p>
        </div>
        <Link
          href={`/t/${teacher.slug}`}
          target="_blank"
          className="btn-secondary text-sm"
        >
          View my studio page ↗
        </Link>
      </div>

      {/* KPI row — the prize */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          href="/dashboard/earnings"
          label="This week"
          value={formatMoney(thisWeekCents)}
          accent
        />
        <Kpi
          href="/dashboard/earnings"
          label="Ready to cash out"
          value={formatMoney(availableCents)}
        />
        <Kpi
          href="/dashboard/audience"
          label={audience.length === 1 ? "Student" : "Students"}
          value={String(audience.length)}
        />
        <Kpi
          href="/dashboard/schedule"
          label="Upcoming classes"
          value={String(occurrences.length)}
        />
      </div>

      {/* Live moment: setup finished, first booking still ahead. */}
      {setupDone && bookings.length === 0 && (
        <div className="card border-brand bg-brand-tint/50">
          <h2 className="font-semibold mb-1">🎉 Your studio is live!</h2>
          <p className="text-sm text-muted">
            Students can book you right now at your link below. Drop it in your
            Instagram bio and your next class announcement — first bookings
            almost always follow the first share.
          </p>
        </div>
      )}

      {/* Setup checklist */}
      {!ready && (
        <div className="card">
          <h2 className="font-semibold mb-3">
            {setupDone
              ? "One step left — the fun one"
              : `Set up your studio (${steps.filter((s) => s.done).length}/${steps.length})`}
          </h2>
          <ul className="space-y-2">
            {steps.map((s) => (
              <li key={s.label}>
                <Link
                  href={s.href}
                  className="flex items-center gap-3 text-sm hover:text-brand-dark"
                >
                  <span
                    className={`flex size-5 items-center justify-center rounded-full text-xs ${
                      s.done ? "bg-brand text-white" : "border border-border text-muted"
                    }`}
                  >
                    {s.done ? "✓" : ""}
                  </span>
                  <span className={s.done ? "line-through text-muted" : ""}>
                    {s.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Founder-only: open cash-out requests. */}
      {cashOutQueue.length > 0 && (
        <div className="card border-accent">
          <h2 className="font-semibold mb-1">💸 Cash-out requests</h2>
          <p className="text-sm text-muted mb-3">
            Send the money on the app they picked, then mark it paid — that
            records the payout and emails them the good news.
          </p>
          <ul className="space-y-3">
            {cashOutQueue.map(({ request, teacherName, teacherEmail }) => (
              <li
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
              >
                <div className="text-sm min-w-0">
                  <p className="font-semibold">
                    {formatMoney(request.amountCents)} → {teacherName}
                  </p>
                  <p className="text-muted break-words">
                    {payoutMethodLabel(request.method)}:{" "}
                    <span className="font-medium text-foreground">{request.handle}</span>{" "}
                    · {teacherEmail}
                  </p>
                  <p className="text-xs text-muted">
                    Requested {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <form action={markPayoutRequestPaidAction}>
                  <input type="hidden" name="requestId" value={request.id} />
                  <button type="submit" className="btn-primary text-sm">
                    ✓ Mark paid
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* The CRM heart: two columns of live cards */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Earnings snapshot */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Earnings</h2>
            <Link href="/dashboard/earnings" className="text-xs text-brand-dark underline">
              Open earnings
            </Link>
          </div>
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
                  title={formatMoney(w.netCents)}
                />
              );
            })}
          </div>
          <p className="text-xs text-muted mt-2">Net, last 8 weeks</p>
          {availableCents > 0 && (
            <Link href="/dashboard/earnings" className="btn-primary text-sm w-full mt-4">
              Cash out {formatMoney(availableCents)} →
            </Link>
          )}
        </div>

        {/* Upcoming classes */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Upcoming classes</h2>
            <Link href="/dashboard/schedule" className="text-xs text-brand-dark underline">
              Manage
            </Link>
          </div>
          {occurrences.length === 0 ? (
            <p className="text-sm text-muted">
              No scheduled classes yet.{" "}
              <Link href="/dashboard/schedule" className="text-brand-dark underline">
                Add class times →
              </Link>
            </p>
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
                      {o.spotsLeft != null && o.spotsLeft <= 5 && (
                        <span className="text-brand-dark"> · {o.spotsLeft} left</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Upcoming bookings */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Upcoming bookings</h2>
            <Link href="/dashboard/bookings" className="text-xs text-brand-dark underline">
              View all
            </Link>
          </div>
          {upcomingBookings.length === 0 ? (
            <p className="text-sm text-muted">
              No upcoming bookings yet — your next student shows up here.
            </p>
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
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Your audience</h2>
            <Link href="/dashboard/audience" className="text-xs text-brand-dark underline">
              View all
            </Link>
          </div>
          {audience.length === 0 ? (
            <p className="text-sm text-muted">
              Everyone who books or buys a pass shows up here — your top fans
              first.
            </p>
          ) : (
            <ul className="space-y-2">
              {audience.slice(0, 4).map((m) => (
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

      {/* Custom quotes quick card */}
      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-semibold mb-1">
            Got a private gig? Send a custom quote 💌
          </h2>
          <p className="text-sm text-muted max-w-xl">
            A party, corporate session, or 1:1 series that doesn&apos;t fit your
            public schedule? Build a one-off quote, send the link, and get paid
            online — no public class needed. Paid quotes flow straight into your
            earnings.
          </p>
        </div>
        <Link href="/dashboard/quotes" className="btn-primary text-sm shrink-0">
          Create a quote →
        </Link>
      </div>

      {/* Share link */}
      <div className="card" id="share-link">
        <h2 className="font-semibold mb-1">Your booking link</h2>
        <p className="text-sm text-muted mb-3">
          {ready
            ? "You're live. Share this link with students and they can book & pay."
            : "Share this once setup is done — students book and pay right here."}
        </p>
        <CopyLink url={publicUrl} />
      </div>

      {/* Founder-only operator tools */}
      {otherTeachers.length > 0 && (
        <div className="card border-dashed">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h2 className="font-semibold">🛠 Operator tools</h2>
            <Link
              href="/dashboard/roster"
              className="text-xs text-brand-dark underline font-medium"
            >
              Open mission control →
            </Link>
          </div>
          <p className="text-sm text-muted mb-3">
            Step into any teacher&apos;s dashboard to demo their business. Only
            you can see this card.
          </p>
          <div className="flex flex-wrap gap-2">
            {otherTeachers.map((t) => (
              <form key={t.id} action={viewAsAction}>
                <input type="hidden" name="teacherId" value={t.id} />
                <button type="submit" className="btn-secondary text-sm">
                  👁 View as {t.name}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      {/* Founder concierge onboarding */}
      <div className="card border-brand ring-1 ring-[var(--ring)]">
        <h2 className="font-semibold mb-1">
          You have a direct line to the founder 👋
        </h2>
        <p className="text-sm text-muted mb-3">
          I&apos;m {FOUNDER.name}, {FOUNDER.title} of Kuleo. Text, call, or email
          me anytime — and I{" "}
          <span className="font-medium text-foreground">highly recommend</span> a
          quick onboarding call so we get you earning fast. It&apos;s free, and
          it&apos;s the fastest way to get set up right.
        </p>
        <div className="flex flex-wrap gap-2">
          <a href={FOUNDER.onboardingCallUrl} target="_blank" rel="noreferrer" className="btn-primary text-sm">
            📅 Book your onboarding call
          </a>
          <a href={FOUNDER.smsHref} className="btn-secondary text-sm">
            💬 Text {FOUNDER.phone}
          </a>
          <a href={`mailto:${FOUNDER.email}`} className="btn-secondary text-sm">
            ✉️ Email
          </a>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  href,
  label,
  value,
  accent = false,
}: {
  href: string;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`card card-lift !p-4 ${accent ? "border-brand bg-brand-tint/40" : ""}`}
    >
      <p className="text-xs text-muted">{label}</p>
      <p
        className={`text-2xl font-semibold mt-1 [font-family:var(--font-display)] ${
          accent ? "text-brand-dark" : ""
        }`}
      >
        {value}
      </p>
    </Link>
  );
}
