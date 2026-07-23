import Link from "next/link";
import { getCurrentTeacher } from "@/lib/session";
import { redirect } from "next/navigation";
import { listSessionTypes, listAvailability, listOffers, listClassEvents } from "@/lib/repo";
import {
  deleteSessionTypeAction,
  addClassEventAction,
  deleteClassEventAction,
  addOfferAction,
  deleteOfferAction,
  addSessionTemplateAction,
  addOfferTemplateAction,
} from "../actions";
import { formatPrice, formatDuration, WEEKDAYS } from "@/lib/format";
import { describeEvent } from "@/lib/events";
import { SessionTypeForm } from "@/components/SessionTypeForm";
import { SESSION_TEMPLATES, OFFER_TEMPLATES } from "@/lib/sku-templates";

function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  const { error, saved } = await searchParams;

  const [allSessionTypes, availability, offers, events] = await Promise.all([
    listSessionTypes(teacher.id),
    listAvailability(teacher.id),
    listOffers(teacher.id),
    listClassEvents(teacher.id),
  ]);
  // Hide soft-deleted (inactive) classes — "Remove" deactivates a class that
  // has booking history, and it should disappear from management too.
  const sessionTypes = allSessionTypes.filter((s) => s.active);
  const eventsBySession = new Map<string, typeof events>();
  for (const ev of events) {
    const list = eventsBySession.get(ev.sessionTypeId) ?? [];
    list.push(ev);
    eventsBySession.set(ev.sessionTypeId, list);
  }
  const activeOffers = offers.filter((o) => o.active);

  const byWeekday = new Map(availability.map((a) => [a.weekday, a]));

  return (
    <div className="max-w-2xl space-y-8">
      {saved && (
        <p className="rounded-lg bg-brand-tint px-3 py-2 text-sm text-brand-dark">
          Class saved.
        </p>
      )}
      <div>
        <h1 className="text-2xl font-semibold mb-1">Schedule &amp; pricing</h1>
        <p className="text-muted text-sm">
          Every class has its times — schedule them right on the class.
          Flexible offerings (like 1:1 coaching) are booked first, scheduled
          together after.
        </p>
      </div>

      {/* ---- Session types ---- */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Session types</h2>

        {sessionTypes.length === 0 ? (
          <p className="text-sm text-muted mb-4">
            No session types yet. Add your first one below.
          </p>
        ) : (
          <ul className="space-y-2 mb-4">
            {sessionTypes.map((s) => (
              <li key={s.id} className="card !p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium flex items-center gap-2 flex-wrap">
                    {s.name}
                    <span className="pill">
                      {s.locationType === "online" ? "💻 Online" : "📍 In person"}
                    </span>
                    {s.scheduling === "flexible" && (
                      <span className="pill-accent">🤝 Flexible scheduling</span>
                    )}
                    {s.capacity != null && (
                      <span className="pill">{s.capacity} spots</span>
                    )}
                  </p>
                  <p className="text-sm text-muted">
                    {formatDuration(s.durationMinutes)} · {formatPrice(s.priceCents)}
                    {s.description ? ` · ${s.description}` : ""}
                  </p>
                  {s.locationType === "online" &&
                    !s.meetingUrl &&
                    (teacher.defaultMeetingUrl ? (
                      <p className="text-xs text-muted mt-1">
                        💻 Uses your default studio room from your Profile.
                      </p>
                    ) : (
                      <p className="text-xs text-danger mt-1">
                        ⚠ No meeting link — set your studio room link once on
                        your <a href="/dashboard/profile" className="underline">Profile</a> and
                        all online classes will use it.
                      </p>
                    ))}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/dashboard/schedule/${s.id}/edit`}
                    className="btn-secondary text-xs"
                  >
                    Edit
                  </Link>
                  <form action={deleteSessionTypeAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className="btn-danger text-xs" type="submit">
                      Remove
                    </button>
                  </form>
                </div>
                </div>

                {/* Class times — the heart of the events model. */}
                {s.scheduling === "flexible" ? (
                  <p className="text-xs text-muted border-t border-border pt-3">
                    🤝 No fixed times — students book, then you schedule
                    together. Make sure your contact info is set on your{" "}
                    <a href="/dashboard/profile" className="underline">Profile</a>.
                  </p>
                ) : (
                  <div className="border-t border-border pt-3 space-y-2">
                    <p className="text-xs font-semibold text-muted">
                      Class times
                    </p>
                    {(eventsBySession.get(s.id) ?? []).length === 0 ? (
                      <p className="text-xs text-danger">
                        ⚠ No times scheduled — this class isn&apos;t bookable
                        until you add one below.
                      </p>
                    ) : (
                      <ul className="flex flex-wrap gap-2">
                        {(eventsBySession.get(s.id) ?? []).map((ev) => (
                          <li
                            key={ev.id}
                            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs"
                          >
                            {ev.kind === "weekly" ? "🔁" : "📅"}{" "}
                            {describeEvent(ev, teacher.timezone)}
                            <form action={deleteClassEventAction}>
                              <input type="hidden" name="id" value={ev.id} />
                              <button
                                type="submit"
                                className="text-muted hover:text-danger cursor-pointer"
                                aria-label="Remove time"
                              >
                                ✕
                              </button>
                            </form>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex flex-wrap items-end gap-2">
                      <form action={addClassEventAction} className="flex items-end gap-2">
                        <input type="hidden" name="sessionTypeId" value={s.id} />
                        <input type="hidden" name="kind" value="weekly" />
                        <div>
                          <label className="label !text-xs">Every</label>
                          <select name="weekday" className="input !py-1.5 !text-xs">
                            {WEEKDAYS.map((d, i) => (
                              <option key={d} value={i}>{d}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="label !text-xs">At</label>
                          <input type="time" name="time" defaultValue="18:00" className="input !py-1.5 !text-xs" />
                        </div>
                        <button type="submit" className="btn-secondary text-xs">
                          + Weekly
                        </button>
                      </form>
                      <form action={addClassEventAction} className="flex items-end gap-2">
                        <input type="hidden" name="sessionTypeId" value={s.id} />
                        <input type="hidden" name="kind" value="once" />
                        <div>
                          <label className="label !text-xs">One-off</label>
                          <input type="datetime-local" name="startAtLocal" className="input !py-1.5 !text-xs" />
                        </div>
                        <button type="submit" className="btn-secondary text-xs">
                          + One-time
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* One-click starter SKUs */}
        <div className="card !p-4 mb-4">
          <p className="text-sm font-medium mb-2">
            ✨ Quick add — popular session types
          </p>
          <div className="flex flex-wrap gap-2">
            {SESSION_TEMPLATES.map((t) => (
              <form key={t.key} action={addSessionTemplateAction}>
                <input type="hidden" name="key" value={t.key} />
                <button type="submit" className="btn-secondary text-xs">
                  + {t.name} · ${t.priceDollars}
                </button>
              </form>
            ))}
          </div>
          <p className="hint mt-2">
            Adds it instantly — then edit the price, remove it, or make it
            yours. Just a starting structure.
          </p>
        </div>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <SessionTypeForm />
      </section>

      {/* ---- Offers: class passes ---- */}
      <section>
        <h2 className="text-lg font-semibold mb-1">Class passes &amp; offers</h2>
        <p className="text-muted text-sm mb-3">
          Sell classes in bundles, like a studio: students buy once, then book
          with the same email and their pass is applied automatically.
        </p>

        {activeOffers.length === 0 ? (
          <p className="text-sm text-muted mb-4">
            No passes yet — start from a template or build your own below.
          </p>
        ) : (
          <ul className="space-y-2 mb-4">
            {activeOffers.map((o) => (
              <li key={o.id} className="card flex items-center justify-between !p-4">
                <div>
                  <p className="font-medium">{o.name}</p>
                  <p className="text-sm text-muted">
                    {formatPrice(o.priceCents)} ·{" "}
                    {o.creditCount == null
                      ? "Unlimited classes"
                      : `${o.creditCount} classes`}
                    {o.validDays ? ` · valid ${o.validDays} days` : " · no expiry"}
                    {o.description ? ` · ${o.description}` : ""}
                  </p>
                </div>
                <form action={deleteOfferAction}>
                  <input type="hidden" name="id" value={o.id} />
                  <button className="btn-danger text-xs" type="submit">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <div className="card !p-4 mb-4">
          <p className="text-sm font-medium mb-2">✨ Quick add — popular passes</p>
          <div className="flex flex-wrap gap-2">
            {OFFER_TEMPLATES.map((t) => (
              <form key={t.key} action={addOfferTemplateAction}>
                <input type="hidden" name="key" value={t.key} />
                <button type="submit" className="btn-secondary text-xs">
                  + {t.name} · ${t.priceDollars}
                </button>
              </form>
            ))}
          </div>
        </div>

        <form action={addOfferAction} className="card space-y-4">
          <p className="font-medium text-sm">Build your own offer</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="offer-name">
                Name
              </label>
              <input
                id="offer-name"
                name="name"
                placeholder="5-Class Pass"
                className="input"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="offer-price">
                Price (USD)
              </label>
              <input
                id="offer-price"
                name="price"
                type="number"
                min={1}
                step="0.01"
                defaultValue={90}
                className="input"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label" htmlFor="offer-kind">
                Type
              </label>
              <select id="offer-kind" name="kind" className="input">
                <option value="credits">Class credits</option>
                <option value="unlimited">Unlimited</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="offer-credits">
                # of classes
              </label>
              <input
                id="offer-credits"
                name="creditCount"
                type="number"
                min={1}
                max={100}
                defaultValue={5}
                className="input"
              />
              <p className="hint">Ignored for unlimited.</p>
            </div>
            <div>
              <label className="label" htmlFor="offer-valid">
                Valid for (days)
              </label>
              <input
                id="offer-valid"
                name="validDays"
                type="number"
                min={0}
                defaultValue={90}
                className="input"
              />
              <p className="hint">0 = never expires.</p>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="offer-desc">
              Short description (optional)
            </label>
            <input
              id="offer-desc"
              name="description"
              placeholder="Five classes, use any time within 3 months"
              className="input"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary">
              Add offer
            </button>
          </div>
        </form>
      </section>

      {/* ---- Legacy availability (pre-events teachers only) ---- */}
      {events.length === 0 && availability.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-1">Weekly availability (legacy)</h2>
          <p className="text-muted text-sm mb-3">
            Your page currently offers times from these availability windows.
            Class-specific times (above) are the new standard — once you add a
            scheduled time to a class, it takes over completely.
          </p>
          <div className="card !p-4 text-sm text-muted">
            {availability
              .map((a) => `${WEEKDAYS[a.weekday]} ${toHHMM(a.startMinutes)}–${toHHMM(a.endMinutes)}`)
              .join(" · ")}
          </div>
        </section>
      )}
    </div>
  );
}