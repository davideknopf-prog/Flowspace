import Link from "next/link";
import { getCurrentTeacher } from "@/lib/session";
import { redirect } from "next/navigation";
import { listSessionTypes, listAvailability, listBookings } from "@/lib/repo";
import { CopyLink } from "@/components/CopyLink";
import { formatSlot } from "@/lib/format";
import { headers } from "next/headers";
import { FOUNDER } from "@/lib/founder";

export default async function DashboardHome() {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  const [sessionTypes, availability, bookings] = await Promise.all([
    listSessionTypes(teacher.id),
    listAvailability(teacher.id),
    listBookings(teacher.id),
  ]);

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const publicUrl = `${proto}://${host}/t/${teacher.slug}`;

  const steps = [
    { done: teacher.bio.trim().length > 0, label: "Complete your profile", href: "/dashboard/profile" },
    { done: sessionTypes.length > 0, label: "Add a session type & price", href: "/dashboard/schedule" },
    { done: availability.length > 0, label: "Set your weekly availability", href: "/dashboard/schedule" },
  ];
  const remaining = steps.filter((s) => !s.done).length;

  const now = Date.now();
  const nextUp = bookings
    .filter((b) => new Date(b.startISO).getTime() >= now && b.status === "confirmed")
    .slice(0, 3);

  const ready = remaining === 0;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {teacher.name.split(" ")[0]} 👋</h1>
        <p className="text-muted text-sm">Here&apos;s your studio at a glance.</p>
      </div>

      {/* Setup checklist */}
      {!ready && (
        <div className="card">
          <h2 className="font-semibold mb-3">
            Finish setting up ({3 - remaining}/3)
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

      {/* Founder concierge onboarding */}
      <div className="card border-brand ring-1 ring-[var(--ring)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold mb-1">
              You have a direct line to the founder 👋
            </h2>
            <p className="text-sm text-muted mb-3">
              I&apos;m {FOUNDER.name}, {FOUNDER.title} of Flowspace. Text, call,
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
      <div className="card">
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
