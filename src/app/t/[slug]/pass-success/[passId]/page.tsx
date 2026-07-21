import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeacherBySlug, getPassById, getOffer } from "@/lib/repo";
import { formatPrice } from "@/lib/format";
import { confirmPassForSession } from "@/app/api/stripe/webhook/route";

export default async function PassSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; passId: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { slug, passId } = await params;
  const { session_id } = await searchParams;
  const teacher = await getTeacherBySlug(slug);
  if (!teacher) notFound();

  let pass = await getPassById(passId);
  if (!pass || pass.teacherId !== teacher.id) notFound();

  // Same belt-and-suspenders as bookings: webhook is the source of truth,
  // this fallback covers webhook lag and local dev.
  if (pass.paymentStatus === "pending" && session_id) {
    await confirmPassForSession(session_id);
    pass = (await getPassById(passId)) ?? pass;
  }

  const offer = await getOffer(pass.offerId);
  const isPending = pass.paymentStatus === "pending";

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <div
          className={`mx-auto mb-6 flex size-16 items-center justify-center rounded-full text-white text-3xl ${
            isPending ? "bg-accent" : "bg-brand"
          }`}
        >
          {isPending ? "…" : "🎟"}
        </div>
        <h1 className="text-2xl font-semibold mb-2">
          {isPending ? "Confirming your payment…" : "Your pass is active!"}
        </h1>
        <p className="text-muted mb-6">
          {isPending
            ? "This can take a few seconds — refresh shortly."
            : `A confirmation is on its way to ${pass.clientEmail}.`}
        </p>

        {!isPending && (
          <div className="card text-left space-y-2">
            <Row label="Pass" value={offer?.name ?? "Pass"} />
            <Row label="With" value={teacher.name} />
            <Row
              label="Includes"
              value={
                pass.creditsTotal == null
                  ? "Unlimited classes"
                  : `${pass.creditsTotal} classes`
              }
            />
            <Row
              label="Valid until"
              value={
                pass.expiresAt
                  ? new Date(pass.expiresAt).toLocaleDateString()
                  : "No expiration"
              }
            />
            <Row label="Price" value={formatPrice(pass.priceCents)} />
            <div className="border-t border-border pt-2 text-sm text-muted">
              To use it, book any class with{" "}
              <span className="font-medium">{pass.clientEmail}</span> — your
              pass applies automatically.
            </div>
          </div>
        )}

        <div className="mt-6">
          <Link href={`/t/${teacher.slug}`} className="btn-primary">
            Book your first class →
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
