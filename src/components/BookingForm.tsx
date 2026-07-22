"use client";

import { useState } from "react";
import { bookAction } from "@/app/t/[slug]/actions";
import { formatPrice } from "@/lib/format";

interface Group {
  heading: string;
  slots: { startISO: string; label: string; spotsLeft: number | null }[];
}

export function BookingForm({
  slug,
  sessionTypeId,
  priceCents,
  timezone,
  groups,
  preselect,
  flexible = false,
  teacherFirstName = "your teacher",
}: {
  slug: string;
  sessionTypeId: string;
  priceCents: number;
  timezone: string;
  groups: Group[];
  preselect?: string;
  flexible?: boolean;
  teacherFirstName?: string;
}) {
  const [selected, setSelected] = useState<string | null>(preselect ?? null);
  const showDetails = flexible || selected !== null;
  // Arriving from a specific event means the time is already chosen — showing
  // the full picker again would be a redundant second "pick a time" step.
  // Collapse it to a summary with a "Change" escape hatch instead.
  const [showPicker, setShowPicker] = useState(!preselect);

  const selectedSlot = selected ? findSlot(groups, selected) : null;

  return (
    <div className="mt-6 space-y-6">
      {flexible && (
        <section className="card bg-brand-tint/40">
          <h2 className="font-semibold mb-1">Flexible scheduling</h2>
          <p className="text-sm text-muted">
            Book now — after checkout, you and {teacherFirstName} will pick a
            time together that fits you both.
          </p>
        </section>
      )}

      {/* Step 1: the chosen time (picker only if no time chosen yet) */}
      {flexible ? null : !showPicker && selectedSlot ? (
        <section className="card flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">Your time</h2>
            <p className="text-sm text-muted mt-0.5">
              {selectedSlot.heading} · {selectedSlot.label}{" "}
              <span className="text-xs">({timezone})</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="btn-ghost text-sm shrink-0"
          >
            Change
          </button>
        </section>
      ) : (
      <section className="card">
        <h2 className="font-semibold mb-1">Pick a time</h2>
        <p className="text-xs text-muted mb-4">Times shown in {timezone}.</p>
        <div className="space-y-5 max-h-96 overflow-y-auto pr-1">
          {groups.map((g) => (
            <div key={g.heading}>
              <p className="text-sm font-medium text-muted mb-2">{g.heading}</p>
              <div className="flex flex-wrap gap-2">
                {g.slots.map((s) => {
                  const active = selected === s.startISO;
                  return (
                    <button
                      key={s.startISO}
                      type="button"
                      onClick={() => setSelected(s.startISO)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        active
                          ? "border-brand bg-brand text-white"
                          : "border-border hover:border-brand hover:bg-brand-tint"
                      }`}
                    >
                      {s.label}
                      {s.spotsLeft != null && s.spotsLeft <= 5 && (
                        <span className="ml-1.5 text-[10px] opacity-80">
                          {s.spotsLeft} left
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* Step 2: details + (stubbed) payment */}
      {showDetails && (
        <form action={bookAction} className="card space-y-4">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="sessionTypeId" value={sessionTypeId} />
          <input type="hidden" name="startISO" value={selected ?? ""} />

          <h2 className="font-semibold">Your details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="clientName">
                Name
              </label>
              <input id="clientName" name="clientName" required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="clientEmail">
                Email
              </label>
              <input
                id="clientEmail"
                name="clientEmail"
                type="email"
                required
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="note">
              Anything {`I`} should know? (optional)
            </label>
            <textarea
              id="note"
              name="note"
              className="textarea"
              placeholder="Injuries, goals, experience level…"
            />
          </div>

          {priceCents > 0 && (
            <div className="rounded-lg border border-border bg-brand-tint/40 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total</span>
                <span className="text-sm font-semibold">
                  {formatPrice(priceCents)}
                </span>
              </div>
              <p className="text-xs text-muted mt-2">
                🔒 You&apos;ll pay securely via Stripe on the next step. Your
                spot is held for 30 minutes while you check out.
              </p>
            </div>
          )}

          <button type="submit" className="btn-primary w-full">
            {priceCents === 0
              ? "Confirm booking"
              : `Continue to payment · ${formatPrice(priceCents)}`}
          </button>
          <p className="text-center text-xs text-muted">
            By booking you agree to Kuleo&apos;s{" "}
            <a href="/terms" target="_blank" className="underline underline-offset-2 hover:text-foreground">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/waiver" target="_blank" className="underline underline-offset-2 hover:text-foreground">
              Liability Waiver &amp; Assumption of Risk
            </a>
            .
          </p>
        </form>
      )}
    </div>
  );
}

function findSlot(
  groups: Group[],
  startISO: string,
): { heading: string; label: string } | null {
  for (const g of groups) {
    const slot = g.slots.find((s) => s.startISO === startISO);
    if (slot) return { heading: g.heading, label: slot.label };
  }
  return null;
}
