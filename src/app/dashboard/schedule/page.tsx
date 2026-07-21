import { getCurrentTeacher } from "@/lib/session";
import { redirect } from "next/navigation";
import { listSessionTypes, listAvailability, listOffers } from "@/lib/repo";
import {
  deleteSessionTypeAction,
  saveAvailabilityAction,
  addOfferAction,
  deleteOfferAction,
  addSessionTemplateAction,
  addOfferTemplateAction,
} from "../actions";
import { formatPrice, formatDuration, WEEKDAYS } from "@/lib/format";
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
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  const { saved, error } = await searchParams;

  const [sessionTypes, availability, offers] = await Promise.all([
    listSessionTypes(teacher.id),
    listAvailability(teacher.id),
    listOffers(teacher.id),
  ]);
  const activeOffers = offers.filter((o) => o.active);

  const byWeekday = new Map(availability.map((a) => [a.weekday, a]));

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Schedule &amp; pricing</h1>
        <p className="text-muted text-sm">
          Define what you offer and when you&apos;re available. Students book
          against this on your public page.
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
              <li
                key={s.id}
                className="card flex items-center justify-between !p-4"
              >
                <div>
                  <p className="font-medium flex items-center gap-2">
                    {s.name}
                    <span className="pill">
                      {s.locationType === "online" ? "💻 Online" : "📍 In person"}
                    </span>
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
                <form action={deleteSessionTypeAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="btn-danger text-xs" type="submit">
                    Remove
                  </button>
                </form>
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

      {/* ---- Weekly availability ---- */}
      <section>
        <h2 className="text-lg font-semibold mb-1">Weekly availability</h2>
        <p className="text-muted text-sm mb-3">
          Times are in your timezone ({teacher.timezone}). We generate bookable
          slots inside these windows for the next two weeks.
        </p>

        {saved && (
          <p className="mb-3 rounded-lg bg-brand-tint px-3 py-2 text-sm text-brand-dark">
            Availability saved.
          </p>
        )}

        <form action={saveAvailabilityAction} className="card space-y-3">
          {WEEKDAYS.map((day, weekday) => {
            const rule = byWeekday.get(weekday);
            return (
              <div
                key={weekday}
                className="grid grid-cols-[1.2fr_1fr_auto_1fr] items-center gap-3"
              >
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name={`enabled_${weekday}`}
                    defaultChecked={!!rule}
                    className="size-4 accent-[var(--brand)]"
                  />
                  {day}
                </label>
                <input
                  type="time"
                  name={`start_${weekday}`}
                  defaultValue={toHHMM(rule?.startMinutes ?? 9 * 60)}
                  className="input !py-1.5"
                />
                <span className="text-muted text-sm text-center">to</span>
                <input
                  type="time"
                  name={`end_${weekday}`}
                  defaultValue={toHHMM(rule?.endMinutes ?? 17 * 60)}
                  className="input !py-1.5"
                />
              </div>
            );
          })}
          <div className="flex justify-end pt-2">
            <button type="submit" className="btn-primary">
              Save availability
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
