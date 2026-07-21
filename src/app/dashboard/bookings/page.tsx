import { getCurrentTeacher } from "@/lib/session";
import { redirect } from "next/navigation";
import { listBookings, listSessionTypes } from "@/lib/repo";
import { formatPrice, formatSlot } from "@/lib/format";

export default async function BookingsPage() {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  const [bookings, sessionTypes] = await Promise.all([
    listBookings(teacher.id),
    listSessionTypes(teacher.id),
  ]);
  const nameOf = new Map(sessionTypes.map((s) => [s.id, s.name]));

  const now = Date.now();
  const upcoming = bookings.filter(
    (b) => new Date(b.startISO).getTime() >= now && b.status === "confirmed",
  );
  const past = bookings.filter(
    (b) => new Date(b.startISO).getTime() < now || b.status !== "confirmed",
  );

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-1">Bookings</h1>
      <p className="text-muted text-sm mb-6">
        Every session students book with you shows up here.
      </p>

      {bookings.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-muted text-sm">
            No bookings yet. Share your{" "}
            <a
              href={`/t/${teacher.slug}`}
              target="_blank"
              className="text-brand-dark underline"
            >
              public page
            </a>{" "}
            to start taking bookings.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <Section
            title={`Upcoming (${upcoming.length})`}
            items={upcoming}
            nameOf={nameOf}
            tz={teacher.timezone}
          />
          {past.length > 0 && (
            <Section
              title="Past & cancelled"
              items={past}
              nameOf={nameOf}
              tz={teacher.timezone}
              muted
            />
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  nameOf,
  tz,
  muted,
}: {
  title: string;
  items: Awaited<ReturnType<typeof listBookings>>;
  nameOf: Map<string, string>;
  tz: string;
  muted?: boolean;
}) {
  if (items.length === 0) {
    return (
      <div>
        <h2 className="text-sm font-semibold text-muted mb-2">{title}</h2>
        <p className="text-sm text-muted">Nothing here yet.</p>
      </div>
    );
  }
  return (
    <div>
      <h2 className="text-sm font-semibold text-muted mb-2">{title}</h2>
      <ul className="space-y-2">
        {items.map((b) => (
          <li
            key={b.id}
            className={`card !p-4 flex items-center justify-between ${
              muted ? "opacity-70" : ""
            }`}
          >
            <div className="min-w-0">
              <p className="font-medium">
                {b.clientName}{" "}
                <span className="font-normal text-muted">
                  · {nameOf.get(b.sessionTypeId) ?? "Session"}
                </span>
              </p>
              <p className="text-sm text-muted">
                {formatSlot(b.startISO, tz)} · {b.clientEmail}
              </p>
              <p className="text-xs text-muted mt-1 truncate">
                {b.locationType === "in_person"
                  ? `📍 ${b.locationNote || "In person"}`
                  : b.meetingUrl
                    ? `💻 ${b.meetingUrl}`
                    : "💻 Online — no link set"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{formatPrice(b.priceCents)}</p>
              <span className="pill">
                {b.paymentStatus === "paid"
                  ? "Paid ✓"
                  : b.paymentStatus === "pass"
                    ? "Pass 🎟"
                    : b.paymentStatus === "free"
                      ? "Free"
                      : "Payment pending"}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
