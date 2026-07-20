"use client";

import { useState } from "react";
import { bookAction } from "@/app/t/[slug]/actions";
import { formatPrice } from "@/lib/format";

interface Group {
  heading: string;
  slots: { startISO: string; label: string }[];
}

export function BookingForm({
  slug,
  sessionTypeId,
  priceCents,
  timezone,
  groups,
  preselect,
}: {
  slug: string;
  sessionTypeId: string;
  priceCents: number;
  timezone: string;
  groups: Group[];
  preselect?: string;
}) {
  const [selected, setSelected] = useState<string | null>(preselect ?? null);

  return (
    <div className="mt-6 space-y-6">
      {/* Step 1: pick a time */}
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
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Step 2: details + (stubbed) payment */}
      {selected && (
        <form action={bookAction} className="card space-y-4">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="sessionTypeId" value={sessionTypeId} />
          <input type="hidden" name="startISO" value={selected} />

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
        </form>
      )}
    </div>
  );
}
