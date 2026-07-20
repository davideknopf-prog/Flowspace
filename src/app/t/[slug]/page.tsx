import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTeacherBySlug, listSessionTypes } from "@/lib/repo";
import { Avatar } from "@/components/Avatar";
import { formatPrice, formatDuration } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const teacher = await getTeacherBySlug(slug);
  if (!teacher) return { title: "Not found" };
  return {
    title: `${teacher.name} — Book a session`,
    description: teacher.headline || teacher.bio.slice(0, 140),
  };
}

export default async function PublicProfile({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error } = await searchParams;
  const teacher = await getTeacherBySlug(slug);
  if (!teacher) notFound();

  const sessionTypes = (await listSessionTypes(teacher.id)).filter(
    (s) => s.active,
  );

  return (
    <main className="min-h-screen">
      {/* Header band */}
      <div className="bg-brand-tint border-b border-border">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="flex items-start gap-4">
            <Avatar name={teacher.name} src={teacher.avatarUrl} size={72} />
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold">{teacher.name}</h1>
              {teacher.headline && (
                <p className="text-brand-dark">{teacher.headline}</p>
              )}
              {teacher.location && (
                <p className="text-sm text-muted mt-1">📍 {teacher.location}</p>
              )}
            </div>
          </div>
          {teacher.specialties.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {teacher.specialties.map((s) => (
                <span key={s} className="pill">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        {teacher.bio && (
          <section>
            <h2 className="text-sm font-semibold text-muted mb-2">About</h2>
            <p className="whitespace-pre-line leading-relaxed">{teacher.bio}</p>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-3">Book a session</h2>
          {sessionTypes.length === 0 ? (
            <div className="card text-center py-8 text-sm text-muted">
              {teacher.name.split(" ")[0]} hasn&apos;t published any sessions
              yet. Check back soon.
            </div>
          ) : (
            <ul className="space-y-3">
              {sessionTypes.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/t/${teacher.slug}/book/${s.id}`}
                    className="card flex items-center justify-between hover:border-brand transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium flex items-center gap-2">
                        {s.name}
                        <span className="pill">
                          {s.locationType === "online"
                            ? "💻 Online"
                            : "📍 In person"}
                        </span>
                      </p>
                      <p className="text-sm text-muted">
                        {formatDuration(s.durationMinutes)}
                        {s.description ? ` · ${s.description}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0 pl-4">
                      <p className="font-semibold">{formatPrice(s.priceCents)}</p>
                      <span className="text-xs text-brand-dark">Book →</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="pt-6 border-t border-border text-center text-xs text-muted">
          Powered by <span className="font-medium">Flowspace</span> 🧘
        </footer>
      </div>
    </main>
  );
}
