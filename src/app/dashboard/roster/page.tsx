import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewerContext } from "@/lib/session";
import { getFounderRoster, type RosterEntry } from "@/lib/repo";
import { formatMoney } from "@/lib/format";
import { viewAsAction } from "../actions";

export const dynamic = "force-dynamic";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function SubBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: string }> = {
    active: { label: "Active", tone: "bg-green-100 text-green-800" },
    trialing: { label: "Trial", tone: "bg-blue-100 text-blue-800" },
    past_due: { label: "Past due", tone: "bg-amber-100 text-amber-800" },
    canceled: { label: "Canceled", tone: "bg-gray-100 text-gray-600" },
    none: { label: "No plan", tone: "bg-rose-100 text-rose-700" },
  };
  const s = map[status] ?? { label: status, tone: "bg-gray-100 text-gray-600" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.tone}`}>
      {s.label}
    </span>
  );
}

export default async function RosterPage() {
  const ctx = await getViewerContext();
  if (!ctx) redirect("/login");
  if (!ctx.isFounderViewer) redirect("/dashboard");

  const all = await getFounderRoster();
  const real = all.filter((t) => !t.isDemo);
  const demoCount = all.length - real.length;

  const activeSubs = real.filter(
    (t) => t.subscriptionStatus === "active" || t.subscriptionStatus === "trialing",
  ).length;
  const totalBookings = real.reduce((n, t) => n + t.bookingCount, 0);
  const totalStudents = real.reduce((n, t) => n + t.studentCount, 0);
  const totalGross = real.reduce((n, t) => n + t.grossCents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mission control</h1>
        <p className="text-muted text-sm">
          Every teacher on Kuleo at a glance. Only you can see this.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat label="Teachers" value={String(real.length)} accent />
        <Stat label="Active plans" value={String(activeSubs)} />
        <Stat label="Bookings" value={String(totalBookings)} />
        <Stat label="Students" value={String(totalStudents)} />
        <Stat label="Revenue" value={formatMoney(totalGross)} />
      </div>

      {real.length === 0 ? (
        <div className="card text-center py-10 text-sm text-muted">
          No real teachers yet — your first signups will appear here.
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card !p-0 overflow-x-auto hidden md:block">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Teacher</th>
                  <th className="px-3 py-3 font-medium">Joined</th>
                  <th className="px-3 py-3 font-medium">Plan</th>
                  <th className="px-3 py-3 font-medium">Setup</th>
                  <th className="px-3 py-3 font-medium text-right">Bookings</th>
                  <th className="px-3 py-3 font-medium text-right">Students</th>
                  <th className="px-3 py-3 font-medium text-right">Revenue</th>
                  <th className="px-3 py-3 font-medium">Last active</th>
                  <th className="px-3 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {real.map((t) => (
                  <RosterRow key={t.id} t={t} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {real.map((t) => (
              <RosterCard key={t.id} t={t} />
            ))}
          </div>
        </>
      )}

      {demoCount > 0 && (
        <p className="text-xs text-muted">
          + {demoCount} demo profile{demoCount === 1 ? "" : "s"} (hidden here;
          bookings disabled).
        </p>
      )}
    </div>
  );
}

function attention(t: RosterEntry): string | null {
  const d = daysSince(t.lastActivityAt);
  if (t.subscriptionStatus === "past_due") return "Payment past due";
  if (t.classCount === 0) return "No classes set up";
  if (!t.hasBio) return "Profile incomplete";
  if (t.bookingCount === 0) return "No bookings yet";
  if (d != null && d >= 14) return `Quiet ${d}d`;
  return null;
}

function RosterRow({ t }: { t: RosterEntry }) {
  const flag = attention(t);
  return (
    <tr className="border-b border-border last:border-0 align-middle">
      <td className="px-4 py-3">
        <div className="font-medium">{t.name}</div>
        <div className="text-xs text-muted">{t.email}</div>
        {flag && (
          <div className="text-xs text-amber-700 mt-0.5">⚠ {flag}</div>
        )}
      </td>
      <td className="px-3 py-3 text-muted whitespace-nowrap">{fmtDate(t.createdAt)}</td>
      <td className="px-3 py-3"><SubBadge status={t.subscriptionStatus} /></td>
      <td className="px-3 py-3 text-muted whitespace-nowrap">
        {t.classCount} class{t.classCount === 1 ? "" : "es"}
      </td>
      <td className="px-3 py-3 text-right">{t.bookingCount}</td>
      <td className="px-3 py-3 text-right">{t.studentCount}</td>
      <td className="px-3 py-3 text-right font-medium">{formatMoney(t.grossCents)}</td>
      <td className="px-3 py-3 text-muted whitespace-nowrap">{fmtDate(t.lastActivityAt)}</td>
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2 justify-end">
          <Link
            href={`/t/${t.slug}`}
            target="_blank"
            className="text-xs text-brand-dark underline"
          >
            Page ↗
          </Link>
          <form action={viewAsAction}>
            <input type="hidden" name="teacherId" value={t.id} />
            <button type="submit" className="btn-secondary !py-1 text-xs">
              View as
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}

function RosterCard({ t }: { t: RosterEntry }) {
  const flag = attention(t);
  return (
    <div className="card space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium truncate">{t.name}</p>
          <p className="text-xs text-muted truncate">{t.email}</p>
        </div>
        <SubBadge status={t.subscriptionStatus} />
      </div>
      {flag && <p className="text-xs text-amber-700">⚠ {flag}</p>}
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div>
          <p className="font-semibold">{t.bookingCount}</p>
          <p className="text-xs text-muted">bookings</p>
        </div>
        <div>
          <p className="font-semibold">{t.studentCount}</p>
          <p className="text-xs text-muted">students</p>
        </div>
        <div>
          <p className="font-semibold">{formatMoney(t.grossCents)}</p>
          <p className="text-xs text-muted">revenue</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-muted pt-1">
        <span>Joined {fmtDate(t.createdAt)}</span>
        <span>Active {fmtDate(t.lastActivityAt)}</span>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Link href={`/t/${t.slug}`} target="_blank" className="btn-ghost text-xs px-0 text-brand-dark underline">
          View page ↗
        </Link>
        <form action={viewAsAction} className="ml-auto">
          <input type="hidden" name="teacherId" value={t.id} />
          <button type="submit" className="btn-secondary !py-1 text-xs">
            View as
          </button>
        </form>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`card !p-4 ${accent ? "border-brand bg-brand-tint/40" : ""}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-semibold mt-1 [font-family:var(--font-display)]">
        {value}
      </p>
    </div>
  );
}
