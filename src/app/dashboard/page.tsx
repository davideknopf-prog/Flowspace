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
} from "@/lib/repo";
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

  const [sessionTypes, availability, bookings, events] = await Promise.all([
    listSessionTypes(teacher.id),
    listAvailability(teacher.id),
    listBookings(teacher.id),
    listClassEvents(teacher.id),
  ]);

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const publicUrl = `${proto}://${host}/t/${teacher.slug}`;

  const steps = [
    { done: teacher.bio.trim().length > 0, label: "Complete your profile", href: "/dashboard/profile" },
    { done: sessionTypes.length > 0, label: "Add a session type & price", href: "/dashboard/schedule" },
    {
      // Events are the standard; legacy availability still counts until the
      // teacher converts. Flexible-only teachers pass automatically.
      done:
        events.length > 0 ||
        availability.length > 0 ||
        (sessionTypes.length > 0 && sessionTypes.every((s) => s.scheduling === "flexible")),
      label: "Schedule your class times",
      href: "/dashboard/schedule",
    },
    // The finale — everything above exists so this moment can happen.
    { done: bookings.length > 0, label: "Share your link & get your first booking", href: "#share-link" },
  ];
  const remaining = steps.filter((s) => !s.done).length;

  const now = Date.now();
  const nextUp = bookings
    .filter((b) => b.status === "confirmed" && (!b.startISO || new Date(b.startISO).getTime() >= now))
    .slice(0, 3);

  // "Set up" = the three build steps; the share step is the ongoing finale.
  const setupDone = steps.slice(0, 3).every((s) => s.done);
  const ready = remaining === 0;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {teacher.name.split(" ")[0]} 👋</h1>
        <p className="text-muted text-sm">Here&apos;s your studio at a glance.</p>
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
                      s.done
                        ? "bg-brand text-white"
                        : "border border-border text-muted"
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

      {/* Founder-only: open cash-out requests. Pay on the P2P app first, THEN
          mark paid — that records the payout and emails the teacher. */}
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
                    <span className="font-medium text-foreground">
                      {request.handle}
                    </span>{" "}
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

      {/* Founder-only operator tools */}
      {otherTeachers.length > 0 && (
        <div className="card border-dashed">
          <h2 className="font-semibold mb-1">🛠 Operator tools</h2>
          <p className="text-sm text-muted mb-3">
            Step into any teacher&apos;s dashboard to demo their business —
            earnings, bookings, passes, all of it. Only you can see this card.
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold mb-1">
              You have a direct line to the founder 👋
            </h2>
            <p className="text-sm text-muted mb-3">
              I&apos;m {FOUNDER.name}, {FOUNDER.title} of Kuleo. Text, call,
              or email me anytime — and I <span className="font-medium text-foreground">highly
              recommend</span> a quick onboarding call so we get you earning
              fast. It&apos;s free, and it&apos;s the fastest way to get set up
              right.
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
      </div>

      {/* Share link */}
      <div className="card" id="share-link">
        <h2 className="font-semibold mb-1">Your booking link</h2>
        <p className="text-sm text-muted mb-3">
          {ready
            ? "You're live. Share this link with students and they can book & (soon) pay."
            : "Share this once setup is done — students book and pay right here."}
        </p>
        <CopyLink url={publicUrl} />
        <div className="mt-3">
          <Link href={`/t/${teacher.slug}`} target="_blank" className="btn-ghost text-xs px-0">
            Preview public page ↗
          </Link>
        </div>
      </div>

      {/* Upcoming */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Upcoming bookings</h2>
          <Link href="/dashboard/bookings" className="text-xs text-brand-dark underline">
            View all
          </Link>
        </div>
        {nextUp.length === 0 ? (
          <p className="text-sm text-muted">No upcoming bookings yet.</p>
        ) : (
          <ul className="space-y-2">
            {nextUp.map((b) => (
              <li key={b.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{b.clientName}</span>
                <span className="text-muted">{formatSlot(b.startISO, teacher.timezone)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
