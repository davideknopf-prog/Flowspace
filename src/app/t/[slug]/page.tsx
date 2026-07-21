import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTeacherBySlug, listSessionTypes, listOffers } from "@/lib/repo";
import { Avatar } from "@/components/Avatar";
import { formatPrice, formatDuration } from "@/lib/format";
import { buyPassAction } from "./actions";

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

  const [sessionTypesAll, offersAll] = await Promise.all([
    listSessionTypes(teacher.id),
    listOffers(teacher.id),
  ]);
  const sessionTypes = sessionTypesAll.filter((s) => s.active);
  const offers = offersAll.filter((o) => o.active);

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

        {/* Class passes */}
        {offers.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-1">Class passes</h2>
            <p className="text-sm text-muted mb-3">
              Buy a bundle and save — then book any class with the same email
              and your pass is applied automatically.
            </p>
            <ul className="space-y-3">
              {offers.map((o) => (
                <li key={o.id} className="card">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium">{o.name}</p>
                      <p className="text-sm text-muted">
                        {o.creditCount == null
                          ? "Unlimited classes"
                          : `${o.creditCount} classes`}
                        {o.validDays ? ` · valid ${o.validDays} days` : ""}
                        {o.description ? ` · ${o.description}` : ""}
                      </p>
                    </div>
                    <p className="font-semibold shrink-0 pl-4">
                      {formatPrice(o.priceCents)}
                    </p>
                  </div>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-brand-dark font-medium">
                      Buy this pass →
                    </summary>
                    <form
                      action={buyPassAction}
                      className="mt-3 grid sm:grid-cols-[1fr_1fr_auto] gap-2"
                    >
                      <input type="hidden" name="slug" value={teacher.slug} />
                      <input type="hidden" name="offerId" value={o.id} />
                      <input
                        name="clientName"
                        placeholder="Your name"
                        required
                        className="input"
                      />
                      <input
                        name="clientEmail"
                        type="email"
                        placeholder="you@email.com"
                        required
                        className="input"
                      />
                      <button type="submit" className="btn-primary">
                        Buy · {formatPrice(o.priceCents)}
                      </button>
                    </form>
                    <p className="hint mt-1">
                      🔒 Secure checkout via Stripe. Use the same email when
                      booking classes.
                    </p>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="pt-6 border-t border-border text-center text-xs text-muted">
          Powered by <span className="font-medium">Kuleo</span> 🧘
        </footer>
      </div>
    </main>
  );
}
