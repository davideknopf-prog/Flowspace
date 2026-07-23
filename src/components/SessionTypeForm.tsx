"use client";

import { useState } from "react";
import {
  addSessionTypeAction,
  editSessionTypeAction,
} from "@/app/dashboard/actions";
import type { SessionType } from "@/lib/types";

export function SessionTypeForm({ initial }: { initial?: SessionType }) {
  const editing = Boolean(initial);
  const [locationType, setLocationType] = useState<"online" | "in_person">(
    initial?.locationType ?? "online",
  );
  const [scheduling, setScheduling] = useState<"events" | "flexible">(
    initial?.scheduling ?? "events",
  );

  return (
    <form
      action={editing ? editSessionTypeAction : addSessionTypeAction}
      className="card space-y-4"
    >
      {editing && <input type="hidden" name="id" value={initial!.id} />}
      <p className="font-medium text-sm">
        {editing ? "Class details" : "Add a class"}
      </p>

      <div>
        <label className="label">How is it scheduled?</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setScheduling("events")}
            className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
              scheduling === "events"
                ? "border-brand bg-brand-tint"
                : "border-border hover:border-brand"
            }`}
          >
            <span className="font-medium">📅 Scheduled class</span>
            <span className="block text-xs text-muted mt-0.5">
              Happens at set times you schedule (weekly or one-off). The
              standard.
            </span>
          </button>
          <button
            type="button"
            onClick={() => setScheduling("flexible")}
            className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
              scheduling === "flexible"
                ? "border-brand bg-brand-tint"
                : "border-border hover:border-brand"
            }`}
          >
            <span className="font-medium">🤝 Flexible (coaching)</span>
            <span className="block text-xs text-muted mt-0.5">
              Students book first, then you find a time together.
            </span>
          </button>
        </div>
        <input type="hidden" name="scheduling" value={scheduling} />
      </div>

      {scheduling === "events" && (
        <div>
          <label className="label" htmlFor="capacity">
            Spots per class{" "}
            <span className="font-normal text-muted">(blank = unlimited)</span>
          </label>
          <input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            max={500}
            placeholder="Unlimited"
            defaultValue={initial?.capacity ?? undefined}
            className="input"
          />
        </div>
      )}

      <div>
        <label className="label" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          name="name"
          placeholder="Private Vinyasa (1:1)"
          defaultValue={initial?.name ?? ""}
          className="input"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="durationMinutes">
            Duration (min)
          </label>
          <input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={5}
            max={480}
            step={5}
            defaultValue={initial?.durationMinutes ?? 60}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="price">
            Price (USD)
          </label>
          <input
            id="price"
            name="price"
            type="number"
            min={0}
            step="0.01"
            defaultValue={initial ? (initial.priceCents / 100).toString() : 0}
            className="input"
          />
          <p className="hint">0 = free / donation-based.</p>
        </div>
      </div>

      {/* Format selector */}
      <div>
        <span className="label">Format</span>
        <div className="grid grid-cols-2 gap-2">
          <FormatOption
            value="online"
            current={locationType}
            onSelect={setLocationType}
            icon="💻"
            title="Online"
            subtitle="Zoom / Google Meet"
          />
          <FormatOption
            value="in_person"
            current={locationType}
            onSelect={setLocationType}
            icon="📍"
            title="In person"
            subtitle="Studio or home"
          />
        </div>
        {/* Radio value submitted with the form */}
        <input type="hidden" name="locationType" value={locationType} />
      </div>

      {locationType === "online" ? (
        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="meetingUrl">
              Your meeting link
            </label>
            <input
              id="meetingUrl"
              name="meetingUrl"
              type="url"
              placeholder="https://us02web.zoom.us/j/1234567890"
              defaultValue={initial?.meetingUrl ?? ""}
              className="input"
            />
            <p className="hint">
              Optional — leave empty to use your default studio room from your
              Profile. Students get the link in their confirmation email.
            </p>
          </div>
          <MeetingLinkHelp />
          <div>
            <label className="label" htmlFor="locationNote">
              Note to students (optional)
            </label>
            <input
              id="locationNote"
              name="locationNote"
              placeholder="I'll admit you from the waiting room a few minutes early."
              defaultValue={locationType === "online" ? (initial?.locationNote ?? "") : ""}
              className="input"
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="label" htmlFor="locationNote">
            Address
          </label>
          <input
            id="locationNote"
            name="locationNote"
            placeholder="123 Lotus St, Studio B, Austin TX"
            defaultValue={locationType === "in_person" ? (initial?.locationNote ?? "") : ""}
            className="input"
          />
          <p className="hint">Shown to students after they book.</p>
        </div>
      )}

      <div>
        <label className="label" htmlFor="description">
          Short description (optional)
        </label>
        <input
          id="description"
          name="description"
          placeholder="60 min tailored to your goals"
          defaultValue={initial?.description ?? ""}
          className="input"
        />
      </div>

      <div className="flex justify-end">
        <div>
        <label className="label" htmlFor="confirmationNote">
          Welcome note for this class{" "}
          <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="confirmationNote"
          name="confirmationNote"
          placeholder="Bring a block and a strap — we'll move slow and deep."
          defaultValue={initial?.confirmationNote ?? ""}
          className="textarea !min-h-16"
        />
        <p className="hint">
          Added to the booking confirmation email. Falls back to your default
          note from your Profile.
        </p>
      </div>

      <button type="submit" className="btn-primary">
          {editing ? "Save changes" : "Add class"}
        </button>
      </div>
    </form>
  );
}

function FormatOption({
  value,
  current,
  onSelect,
  icon,
  title,
  subtitle,
}: {
  value: "online" | "in_person";
  current: string;
  onSelect: (v: "online" | "in_person") => void;
  icon: string;
  title: string;
  subtitle: string;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
        active
          ? "border-brand bg-brand-tint"
          : "border-border hover:border-brand"
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted">{subtitle}</span>
      </span>
    </button>
  );
}

// Collapsible, teacher-friendly walkthrough — no jargon.
function MeetingLinkHelp() {
  return (
    <details className="rounded-lg border border-border bg-brand-tint/40 px-3 py-2 text-sm">
      <summary className="cursor-pointer font-medium text-brand-dark">
        Where do I find my meeting link?
      </summary>
      <div className="mt-3 space-y-4 text-foreground">
        <div>
          <p className="font-medium mb-1">🟦 Zoom (free account)</p>
          <ol className="list-decimal ml-5 space-y-1 text-muted">
            <li>Sign in at zoom.us and open <b>Meetings → Personal Room</b>.</li>
            <li>
              Copy the <b>Invite Link</b> (looks like
              {" "}<code>https://…zoom.us/j/…</code>).
            </li>
            <li>Paste it above. You&apos;ll reuse this same room for every class.</li>
          </ol>
        </div>
        <div>
          <p className="font-medium mb-1">🟩 Google Meet (free)</p>
          <ol className="list-decimal ml-5 space-y-1 text-muted">
            <li>Go to <b>meet.google.com</b> and click <b>New meeting</b>.</li>
            <li>Choose <b>Create a meeting for later</b>.</li>
            <li>Copy the link it gives you and paste it above.</li>
          </ol>
        </div>
        <p className="text-xs text-muted">
          Tip: a reusable personal room is perfect for now. Later, Kuleo can
          create a fresh meeting for each class automatically.
        </p>
      </div>
    </details>
  );
}
