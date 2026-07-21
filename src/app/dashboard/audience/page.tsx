import { getCurrentTeacher } from "@/lib/session";
import { redirect } from "next/navigation";
import { getAudience } from "@/lib/repo";
import { formatMoney } from "@/lib/format";
import { AudienceTable } from "@/components/AudienceTable";

// The teacher's people, auto-built from bookings + passes. The CRM seed —
// nothing to set up; anyone who books or buys shows up here, top fans first.
export default async function AudiencePage() {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  const audience = await getAudience(teacher.id);
  const totalFromThem = audience.reduce((sum, m) => sum + m.totalSpentCents, 0);
  const totalClasses = audience.reduce((sum, m) => sum + m.classesBooked, 0);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Audience</h1>
        <p className="text-muted text-sm">
          Everyone who&apos;s booked a class or bought a pass with you — your
          most loyal students first.
        </p>
      </div>

      {audience.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">👋</p>
          <p className="font-medium">Your audience starts here.</p>
          <p className="text-sm text-muted mt-1">
            As soon as someone books a class or buys a pass, they&apos;ll show
            up in this list — no setup needed.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="card text-center !p-4">
              <p className="text-2xl font-semibold">{audience.length}</p>
              <p className="text-xs text-muted">
                {audience.length === 1 ? "person" : "people"}
              </p>
            </div>
            <div className="card text-center !p-4">
              <p className="text-2xl font-semibold">{totalClasses}</p>
              <p className="text-xs text-muted">classes taken</p>
            </div>
            <div className="card text-center !p-4">
              <p className="text-2xl font-semibold">
                {formatMoney(totalFromThem)}
              </p>
              <p className="text-xs text-muted">from your people</p>
            </div>
          </div>

          <AudienceTable audience={audience} />

          <p className="text-xs text-muted">
            Built automatically from your bookings and passes. Use “Copy all
            emails” or “Export CSV” to reach out from your own inbox — in-app
            emailing is coming soon.
          </p>
        </>
      )}
    </div>
  );
}
