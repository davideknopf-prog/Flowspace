import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import type { Metadata } from "next";
import {
  listAllTeachers,
  listSessionTypes,
  listOffers,
  getReviewStats,
} from "@/lib/repo";
import { Avatar } from "@/components/Avatar";
import { LegalFooter } from "@/components/LegalFooter";
import { Stars } from "@/components/Stars";

export const metadata: Metadata = {
  title: "Teachers — Kuleo",
  description: "Browse every yoga teacher on Kuleo and book directly.",
};

export default async function TeachersDirectory() {
  const teachers = await listAllTeachers();

  // Only show teachers who have something bookable/buyable.
  const cards = (
    await Promise.all(
      teachers.map(async (t) => {
        const [sessions, offers, reviews] = await Promise.all([
          listSessionTypes(t.id),
          listOffers(t.id),
          getReviewStats(t.id),
        ]);
        const activeSessions = sessions.filter((s) => s.active);
        const activeOffers = offers.filter((o) => o.active);
        if (activeSessions.length === 0 && activeOffers.length === 0) return null;
        return {
          teacher: t,
          sessionCount: activeSessions.length,
          offerCount: activeOffers.length,
          reviews,
        };
      }),
    )
  ).filter((c) => c !== null);

  return (
    <main className="min-h-screen">
      <SiteHeader />

      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Our teachers</h1>
          <p className="text-muted">
            {cards.length} teacher{cards.length === 1 ? "" : "s"} ready to book —
            every one with their own style, schedule, and passes.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(({ teacher, sessionCount, offerCount, reviews }) => (
            <Link
              key={teacher.id}
              href={`/t/${teacher.slug}`}
              className="card hover:border-brand transition-colors flex flex-col"
            >
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={teacher.name} src={teacher.avatarUrl} size={56} />
                <div className="min-w-0">
                  <p className="font-semibold truncate">{teacher.name}</p>
                  {reviews.count > 0 && (
                    <p className="flex items-center gap-1 text-xs">
                      <Stars rating={reviews.average} className="text-xs" />
                      <span className="font-medium">{reviews.average.toFixed(1)}</span>
                      <span className="text-muted">({reviews.count})</span>
                    </p>
                  )}
                  {teacher.location && (
                    <p className="text-xs text-muted truncate">📍 {teacher.location}</p>
                  )}
                </div>
              </div>
              {teacher.headline && (
                <p className="text-sm text-muted mb-3 flex-1">{teacher.headline}</p>
              )}
              {teacher.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {teacher.specialties.slice(0, 4).map((s) => (
                    <span key={s} className="pill">
                      {s}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-brand-dark font-medium">
                {sessionCount} class type{sessionCount === 1 ? "" : "s"}
                {offerCount > 0 && ` · ${offerCount} pass${offerCount === 1 ? "" : "es"}`}{" "}
                →
              </p>
            </Link>
          ))}
        </div>
      </div>
      <LegalFooter />
    </main>
  );
}
