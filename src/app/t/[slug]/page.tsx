import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getTeacherBySlug,
  listSessionTypes,
  listOffers,
  listAvailability,
  listBookings,
  listReviews,
  getReviewStats,
  listClassEvents,
} from "@/lib/repo";
import { computeUpcomingClasses } from "@/lib/slots";
import { computeOccurrences, describeEvent } from "@/lib/events";
import { Avatar } from "@/components/Avatar";
import { Stars } from "@/components/Stars";
import { formatPrice, formatDuration, formatSlot } from "@/lib/format";
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

  const [sessionTypesAll, offersAll, rules, bookings, reviews, reviewStats, events] =
    await Promise.all([
      listSessionTypes(teacher.id),
      listOffers(teacher.id),
      listAvailability(teacher.id),
      listBookings(teacher.id),
      listReviews(teacher.id, true),
      getReviewStats(teacher.id),
      listClassEvents(teacher.id),
    ]);
  const sessionTypes = sessionTypesAll.filter((s) => s.active);
  const offers = offersAll.filter((o) => o.active);

  // "Coming soon" fast-path: the next open times across all sessions, so a
  // prospect can book in two clicks without scrolling the full menu.
  const sessionById = new Map(sessionTypes.map((s) => [s.id, s]));
  let upcoming: { startISO: string; sessionTypeId: string; spotsLeft: number | null }[] =
    computeOccurrences({
      now: new Date(),
      timeZone: teacher.timezone,
      events,
      sessionTypes,
      bookings,
    })
      .filter((o) => o.spotsLeft !== 0)
      .slice(0, 3);
  // Legacy fallback: availability-derived openings until this teacher
  // schedules real class times.
  if (upcoming.length === 0 && events.length === 0) {
    upcoming = computeUpcomingClasses({
      now: new Date(),
      timeZone: teacher.timezone,
      rules,
      bookings,
      sessionTypes,
      limit: 3,
    }).map((u) => ({ ...u, spotsLeft: null }));
  }

  // Human schedule lines per class ("Tuesdays · 6:00 PM"), for the class cards.
  const scheduleLines = new Map<string, string[]>();
  for (const ev of events) {
    if (!ev.active) continue;
    const line = describeEvent(ev, teacher.timezone);
    if (!line) continue;
    const list = scheduleLines.get(ev.sessionTypeId) ?? [];
    if (list.length < 3) list.push(line);
    scheduleLines.set(ev.sessionTypeId, list);
  }

  // Page customization: teacher-chosen accent color tints the header band;
  // a cover photo (if set) crowns the page. brandColor is validated to a
  // 6-digit hex server-side before it ever reaches these inline styles.
  const accent = teacher.brandColor || "";
  const bandStyle = accent
    ? { background: `color-mix(in srgb, ${accent} 16%, #ffffff)` }
    : undefined;
  const accentBarStyle = accent ? { background: accent } : undefined;

  return (
    <main className="min-h-screen">
      {/* Cover photo */}
      {teacher.bannerUrl && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={teacher.bannerUrl}
            alt=""
            className="h-40 sm:h-56 w-full object-cover"
          />
          <div
            className="h-1.5 w-full bg-brand"
            style={accentBarStyle}
          />
        </div>
      )}

      {/* Header band */}
      <div
        className={`border-b border-border ${accent ? "" : "bg-brand-tint"}`}
        style={bandStyle}
      >
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
              {reviewStats.count > 0 && (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm">
                  <Stars rating={reviewStats.average} className="text-sm" />
                  <span className="font-medium">
                    {reviewStats.average.toFixed(1)}
                  </span>
                  <span className="text-muted">
                    ({reviewStats.count}{" "}
                    {reviewStats.count === 1 ? "review" : "reviews"})
                  </span>
                </p>
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

        {/* Coming up — the soonest bookable times, front and center */}
        {upcoming.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-1">Coming up</h2>
            <p className="text-sm text-muted mb-3">
              Grab one of {teacher.name.split(" ")[0]}&apos;s next open times —
              you&apos;ll pick it on the next screen.
            </p>
            <ul className="space-y-2">
              {upcoming.map((u) => {
                const s = sessionById.get(u.sessionTypeId);
                if (!s) return null;
                return (
                  <li key={`${u.sessionTypeId}-${u.startISO}`}>
                    <Link
                      href={`/t/${teacher.slug}/book/${u.sessionTypeId}?start=${encodeURIComponent(u.startISO)}`}
                      className="card flex items-center justify-between gap-4 !py-3 hover:border-brand transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          {formatSlot(u.startISO, teacher.timezone)}
                        </p>
                        <p className="text-sm text-muted truncate">
                          {s.name} · {formatDuration(s.durationMinutes)} ·{" "}
                          {s.locationType === "online"
                            ? "💻 Online"
                            : "📍 In person"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold">
                          {formatPrice(s.priceCents)}
                        </p>
                        <span className="text-xs text-brand-dark">
                          {u.spotsLeft != null && u.spotsLeft <= 5
                            ? `${u.spotsLeft} spots left · Book →`
                            : "Book →"}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="hint mt-2">Times shown in {teacher.timezone}.</p>
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
                      {s.scheduling === "flexible" ? (
                        <p className="text-xs text-brand-dark mt-1">
                          🤝 Flexible — book now, schedule together
                        </p>
                      ) : (
                        (scheduleLines.get(s.id) ?? []).length > 0 && (
                          <p className="text-xs text-brand-dark mt-1">
                            🗓 {(scheduleLines.get(s.id) ?? []).join(" · ")}
                          </p>
                        )
                      )}
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

        {reviews.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-semibold">What students say</h2>
              <span className="flex items-center gap-1 text-sm">
                <Stars rating={reviewStats.average} className="text-sm" />
                <span className="text-muted">
                  {reviewStats.average.toFixed(1)}
                </span>
              </span>
            </div>
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="card !py-4">
                  <Stars rating={r.rating} className="text-sm" />
                  <p className="mt-2 leading-relaxed whitespace-pre-line">
                    “{r.body}”
                  </p>
                  <p className="mt-2 text-sm font-medium text-muted">
                    — {r.authorName}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(teacher.contactPhone || teacher.contactEmail) && (
          <section className="card !p-4">
            <h2 className="text-sm font-semibold mb-1">
              Reach {teacher.name.split(" ")[0]} directly
            </h2>
            <p className="text-sm text-muted">
              Questions, or booked a flexible session? Get in touch:
              {teacher.contactPhone && (
                <>
                  {" "}
                  <a href={`tel:${teacher.contactPhone.replace(/[^+\d]/g, "")}`} className="text-brand-dark font-medium">
                    {teacher.contactPhone}
                  </a>
                </>
              )}
              {teacher.contactPhone && teacher.contactEmail && " · "}
              {teacher.contactEmail && (
                <a href={`mailto:${teacher.contactEmail}`} className="text-brand-dark font-medium">
                  {teacher.contactEmail}
                </a>
              )}
            </p>
          </section>
        )}

        <footer className="pt-6 border-t border-border text-center text-xs text-muted space-y-2">
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link href="/waiver" className="hover:text-foreground">Liability Waiver</Link>
          </nav>
          Powered by <span className="font-medium">Kuleo</span> 🧘
        </footer>
      </div>
    </main>
  );
}
