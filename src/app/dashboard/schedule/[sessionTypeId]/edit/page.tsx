import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentTeacher } from "@/lib/session";
import { getSessionType, listClassEvents } from "@/lib/repo";
import { SessionTypeForm } from "@/components/SessionTypeForm";
import { WEEKDAYS } from "@/lib/format";
import {
  addClassEventAction,
  editClassEventAction,
  deleteClassEventAction,
} from "../../../actions";

function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// UTC ISO → "YYYY-MM-DDThh:mm" wall-clock in the teacher's timezone, for
// prefilling a datetime-local input.
function toLocalInput(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

export default async function EditClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionTypeId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { sessionTypeId } = await params;
  const { error, saved } = await searchParams;
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  const sessionType = await getSessionType(sessionTypeId);
  if (!sessionType || sessionType.teacherId !== teacher.id) notFound();

  const allEvents = await listClassEvents(teacher.id);
  const events = allEvents.filter((e) => e.sessionTypeId === sessionTypeId);
  const back = `/dashboard/schedule/${sessionTypeId}/edit`;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/dashboard/schedule"
          className="text-sm text-muted hover:text-foreground"
        >
          ← Back to schedule
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Edit class</h1>
        <p className="text-muted text-sm">
          Change any detail — it updates everywhere instantly. No need to
          recreate anything.
        </p>
      </div>

      {saved && (
        <p className="rounded-lg bg-brand-tint px-3 py-2 text-sm text-brand-dark">
          Saved.
        </p>
      )}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
          {decodeURIComponent(error).replace(/\+/g, " ")}
        </p>
      )}

      {/* Class details (name, price, description, duration, capacity, …) */}
      <SessionTypeForm initial={sessionType} />

      {/* Class times — only for scheduled classes. */}
      {sessionType.scheduling === "events" && (
        <section className="card space-y-4">
          <div>
            <p className="font-semibold text-sm">Class times</p>
            <p className="text-xs text-muted">
              Edit a time in place, or add and remove times. Weekly times repeat
              every week; one-off times happen once.
            </p>
          </div>

          {events.length === 0 ? (
            <p className="text-xs text-danger">
              ⚠ No times scheduled — this class isn&apos;t bookable until you
              add one below.
            </p>
          ) : (
            <ul className="space-y-2">
              {events.map((ev) => (
                <li
                  key={ev.id}
                  className="rounded-lg border border-border p-3 flex flex-wrap items-end gap-2"
                >
                  {ev.kind === "weekly" ? (
                    <form
                      action={editClassEventAction}
                      className="flex flex-wrap items-end gap-2"
                    >
                      <input type="hidden" name="id" value={ev.id} />
                      <input type="hidden" name="kind" value="weekly" />
                      <input type="hidden" name="returnTo" value={back} />
                      <div>
                        <label className="label !text-xs">🔁 Every</label>
                        <select
                          name="weekday"
                          defaultValue={ev.weekday ?? 0}
                          className="input !py-1.5 !text-xs"
                        >
                          {WEEKDAYS.map((d, i) => (
                            <option key={d} value={i}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label !text-xs">At</label>
                        <input
                          type="time"
                          name="time"
                          defaultValue={toHHMM(ev.startMinutes ?? 1080)}
                          className="input !py-1.5 !text-xs"
                        />
                      </div>
                      <button type="submit" className="btn-secondary text-xs">
                        Save
                      </button>
                    </form>
                  ) : (
                    <form
                      action={editClassEventAction}
                      className="flex flex-wrap items-end gap-2"
                    >
                      <input type="hidden" name="id" value={ev.id} />
                      <input type="hidden" name="kind" value="once" />
                      <input type="hidden" name="returnTo" value={back} />
                      <div>
                        <label className="label !text-xs">📅 One-off</label>
                        <input
                          type="datetime-local"
                          name="startAtLocal"
                          defaultValue={
                            ev.startAt
                              ? toLocalInput(ev.startAt, teacher.timezone)
                              : ""
                          }
                          className="input !py-1.5 !text-xs"
                        />
                      </div>
                      <button type="submit" className="btn-secondary text-xs">
                        Save
                      </button>
                    </form>
                  )}
                  <form action={deleteClassEventAction} className="ml-auto">
                    <input type="hidden" name="id" value={ev.id} />
                    <input type="hidden" name="returnTo" value={back} />
                    <button
                      type="submit"
                      className="btn-ghost text-xs text-danger"
                    >
                      Remove
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          {/* Add a new time */}
          <div className="border-t border-border pt-4 flex flex-wrap items-end gap-3">
            <form
              action={addClassEventAction}
              className="flex flex-wrap items-end gap-2"
            >
              <input type="hidden" name="sessionTypeId" value={sessionTypeId} />
              <input type="hidden" name="kind" value="weekly" />
              <input type="hidden" name="returnTo" value={back} />
              <div>
                <label className="label !text-xs">Add weekly · every</label>
                <select name="weekday" className="input !py-1.5 !text-xs">
                  {WEEKDAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label !text-xs">At</label>
                <input
                  type="time"
                  name="time"
                  defaultValue="18:00"
                  className="input !py-1.5 !text-xs"
                />
              </div>
              <button type="submit" className="btn-secondary text-xs">
                + Weekly
              </button>
            </form>
            <form
              action={addClassEventAction}
              className="flex flex-wrap items-end gap-2"
            >
              <input type="hidden" name="sessionTypeId" value={sessionTypeId} />
              <input type="hidden" name="kind" value="once" />
              <input type="hidden" name="returnTo" value={back} />
              <div>
                <label className="label !text-xs">Add one-off</label>
                <input
                  type="datetime-local"
                  name="startAtLocal"
                  className="input !py-1.5 !text-xs"
                />
              </div>
              <button type="submit" className="btn-secondary text-xs">
                + One-time
              </button>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
