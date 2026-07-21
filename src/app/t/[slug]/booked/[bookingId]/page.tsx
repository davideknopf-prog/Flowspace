import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeacherBySlug, getBookingById, getSessionType } from "@/lib/repo";
import { formatSlot, formatPrice, formatDuration } from "@/lib/format";
import { emailConfigured } from "@/lib/email";
import { confirmBookingForSession } from "@/app/api/stripe/webhook/route";

export default async function BookedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; bookingId: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { slug, bookingId } = await params;
  const { session_id } = await searchParams;
  const teacher = await getTeacherBySlug(slug);
  if (!teacher) notFound();

  let booking = await getBookingById(bookingId);
  if (!booking || booking.teacherId !== teacher.id) notFound();

  // Belt-and-suspenders: the webhook is the source of truth, but it can lag a
  // few seconds (and can't reach localhost at all in local dev). If Stripe
  // sent the student back with a session_id and we're still "pending", check
  // directly with Stripe right here — markBookingPaid() is idempotent, so
  // this safely no-ops if the webhook already won the race.
  if (booking.paymentStatus === "pending" && session_id) {
    await confirmBookingForSession(session_id);
    booking = (await getBookingById(bookingId)) ?? booking;
  }

  const sessionType = await getSessionType(booking.sessionTypeId);
  const isOnline = booking.locationType === "online";
  const isPending = booking.paymentStatus === "pending";

  const paymentLabel =
    booking.paymentStatus === "paid"
      ? "Paid ✓"
      : booking.paymentStatus === "pass"
        ? "Paid with your pass 🎟"
        : booking.paymentStatus === "free"
          ? "Free"
          : "Confirming…";

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <div
          className={`mx-auto mb-6 flex size-16 items-center justify-center rounded-full text-white text-3xl ${
            isPending ? "bg-accent" : "bg-brand"
          }`}
        >
          {isPending ? "…" : "✓"}
        </div>
        <h1 className="text-2xl font-semibold mb-2">
          {isPending ? "Confirming your payment…" : "You're booked!"}
        </h1>
        <p className="text-muted mb-6">
          {isPending
            ? "This can take a few seconds. Refresh this page shortly — you'll see your confirmation as soon as payment clears."
            : emailConfigured()
              ? `A confirmation is on its way to ${booking.clientEmail}.`
              : `Save these details — a confirmation email goes to ${booking.clientEmail} once email is switched on.`}
        </p>

        {!isPending && (
          <>
            {/* Prominent join link / address */}
            {isOnline ? (
              booking.meetingUrl ? (
                <div className="card text-left mb-4 bg-brand-tint/50">
                  <p className="text-sm font-medium mb-2">💻 Join link</p>
                  <a
                    href={booking.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-dark underline break-all text-sm"
                  >
                    {booking.meetingUrl}
                  </a>
                  {booking.locationNote && (
                    <p className="text-xs text-muted mt-2">{booking.locationNote}</p>
                  )}
                </div>
              ) : (
                <div className="card text-left mb-4 text-sm text-muted">
                  {teacher.name.split(" ")[0]} will email you the join link before
                  the session.
                </div>
              )
            ) : (
              <div className="card text-left mb-4 bg-brand-tint/50">
                <p className="text-sm font-medium mb-1">📍 Location</p>
                <p className="text-sm">
                  {booking.locationNote || "Your teacher will share the address."}
                </p>
              </div>
            )}

            <div className="card text-left space-y-2">
              <Row label="Session" value={sessionType?.name ?? "Session"} />
              <Row label="With" value={teacher.name} />
              <Row label="When" value={formatSlot(booking.startISO, teacher.timezone)} />
              <Row label="Duration" value={formatDuration(booking.durationMinutes)} />
              <Row label="Price" value={formatPrice(booking.priceCents)} />
              <Row label="Payment" value={paymentLabel} />
            </div>
          </>
        )}

        <div className="mt-6">
          <Link href={`/t/${teacher.slug}`} className="btn-secondary">
            Back to {teacher.name.split(" ")[0]}&apos;s page
          </Link>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
