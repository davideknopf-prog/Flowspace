import Link from "next/link";
import type { Metadata } from "next";
import { listAllTeachers, listSessionTypes, listOffers } from "@/lib/repo";
import { Avatar } from "@/components/Avatar";

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
        const [sessions, offers] = await Promise.all([
          listSessionTypes(t.id),
          listOffers(t.id),
        ]);
        const activeSessions = sessions.filter((s) => s.active);
        const activeOffers = offers.filter((o) => o.active);
        if (activeSessions.length === 0 && activeOffers.length === 0) return null;
        return { teacher: t, sessionCount: activeSessions.length, offerCount: activeOffers.length };
      }),
    )
  ).filter((c) => c !== null);

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-brand-dark">
            <span className="text-xl">🧘</span> Kuleo
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/schedule" className="btn-ghost text-sm">
              Studio schedule
            </Link>
            <Link href="/signup" className="btn-primary text-sm">
              Teach on Kuleo
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Our teachers</h1>
          <p className="text-muted">
            {cards.length} teacher{cards.length === 1 ? "" : "s"} ready to book —
            every one with their own style, schedule, and passes.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(({ teacher, sessionCount, offerCount }) => (
            <Link
              key={teacher.id}
              href={`/t/${teacher.slug}`}
              className="card hover:border-brand transition-colors flex flex-col"
            >
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={teacher.name} src={teacher.avatarUrl} size={56} />
                <div className="min-w-0">
                  <p className="font-semibold truncate">{teacher.name}</p>
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
    </main>
  );
}
