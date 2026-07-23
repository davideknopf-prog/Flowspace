import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooterBar } from "@/components/SiteFooterBar";
import type { Metadata } from "next";
import { getStudioSchedule } from "@/lib/studio";
import { Avatar } from "@/components/Avatar";
import { formatPrice, formatDuration } from "@/lib/format";
import { LegalFooter } from "@/components/LegalFooter";

export const metadata: Metadata = {
  title: "New to Kuleo? — take a class with a verified teacher",
  description:
    "Kuleo is an online yoga studio: real classes from independent, verified teachers. Browse today's classes, book in one click, and practice from anywhere.",
};

export const revalidate = 300;

export default async function StudentsPage() {
  const { entries, teachers } = await getStudioSchedule(6);

  return (
    <main className="min-h-screen">
      <SiteHeader />

      {/* What Kuleo is, for a student */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <span className="pill mb-5">New students</span>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
          One studio. Independent teachers. Classes all week.
        </h1>
        <p className="mt-5 text-lg text-muted max-w-2xl mx-auto">
          Kuleo is an online yoga studio made up of independent, verified
          teachers. Every class you see here is taught live by a real teacher
          who sets their own style, schedule, and prices — and keeps what you
          pay them. No memberships, no apps to download: find a class, book it,
          and show up.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/schedule" className="btn-primary">
            See today&apos;s classes
          </Link>
          <Link href="/teachers" className="btn-secondary">
            Meet our teachers
          </Link>
        </div>
      </section>

      {/* How it works for students */}
      <section className="bg-brand-tint border-y border-border">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <h2 className="text-2xl font-semibold text-center mb-10">
            How it works
          </h2>
          <ol className="grid sm:grid-cols-3 gap-8">
            <li className="text-center">
              <div className="mx-auto mb-3 flex size-9 items-center justify-center rounded-full bg-brand text-white font-semibold">
                1
              </div>
              <h3 className="font-semibold mb-1">Find your class</h3>
              <p className="text-sm text-muted">
                Browse the studio schedule or pick a teacher whose style speaks
                to you — vinyasa, restorative, beginners, and more.
              </p>
            </li>
            <li className="text-center">
              <div className="mx-auto mb-3 flex size-9 items-center justify-center rounded-full bg-brand text-white font-semibold">
                2
              </div>
              <h3 className="font-semibold mb-1">Book in one click</h3>
              <p className="text-sm text-muted">
                Pick your time, pay securely, and get your confirmation and
                class link by email. Class passes save you money with your
                favorite teacher.
              </p>
            </li>
            <li className="text-center">
              <div className="mx-auto mb-3 flex size-9 items-center justify-center rounded-full bg-brand text-white font-semibold">
                3
              </div>
              <h3 className="font-semibold mb-1">Show up and practice</h3>
              <p className="text-sm text-muted">
                Join online from anywhere — or in person where offered. Your
                teacher takes it from there.
              </p>
            </li>
          </ol>
        </div>
      </section>

      {/* Live teaser: next classes */}
      <section className="mx-auto max-w-4xl px-4 py-16">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-2xl font-semibold">Happening soon</h2>
          <Link href="/schedule" className="text-sm text-brand-dark font-medium">
            Full schedule →
          </Link>
        </div>
        {entries.length === 0 ? (
          <div className="card text-center py-10 text-muted">
            No upcoming classes this week — check back soon.
          </div>
        ) : (
          <ul className="space-y-2">
            {entries.map((e, i) => (
              <li key={e.bookHref + i}>
                <Link
                  href={e.bookHref}
                  className="card !p-4 flex items-center gap-4 hover:border-brand transition-colors"
                >
                  <div className="w-40 shrink-0 text-sm font-semibold">
                    {e.dayHeading} · {e.timeLabel}
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
        )}
      </section>

      {/* Teachers strip */}
      {teachers.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pb-16">
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-2xl font-semibold">The teachers</h2>
            <Link href="/teachers" className="text-sm text-brand-dark font-medium">
              All teachers →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {teachers.slice(0, 6).map((t) => (
              <Link
                key={t.id}
                href={`/t/${t.slug}`}
                className="card !p-4 flex items-center gap-3 hover:border-brand transition-colors"
              >
                <Avatar name={t.name} src={t.avatarUrl} size={40} />
                <span className="font-medium text-sm truncate">{t.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <SiteFooterBar />
      <LegalFooter />
    </main>
  );
}
