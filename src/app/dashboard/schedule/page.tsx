import { getCurrentTeacher } from "@/lib/session";
import { redirect } from "next/navigation";
import { listSessionTypes, listAvailability } from "@/lib/repo";
import { deleteSessionTypeAction, saveAvailabilityAction } from "../actions";
import { formatPrice, formatDuration, WEEKDAYS } from "@/lib/format";
import { SessionTypeForm } from "@/components/SessionTypeForm";

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

  const [sessionTypes, availability] = await Promise.all([
    listSessionTypes(teacher.id),
    listAvailability(teacher.id),
  ]);

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
                  {s.locationType === "online" && !s.meetingUrl && (
                    <p className="text-xs text-danger mt-1">
                      ⚠ No meeting link yet — add one so students can join.
                    </p>
                  )}
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

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <SessionTypeForm />
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
