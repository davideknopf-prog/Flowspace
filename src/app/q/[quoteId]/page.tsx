import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getQuote, getTeacherById } from "@/lib/repo";
import { confirmQuoteForSession } from "@/app/api/stripe/webhook/route";
import { formatPrice } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { payQuoteAction } from "./actions";

export const metadata: Metadata = { title: "Your quote — Kuleo" };

export default async function QuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ quoteId: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { quoteId } = await params;
  const { session_id } = await searchParams;

  // Returning from Stripe → confirm as a fallback to the webhook.
  if (session_id) {
    try {
      await confirmQuoteForSession(session_id);
    } catch {
      // webhook will reconcile; page reflects whatever state it reads
    }
  }

  let quote = await getQuote(quoteId);
  if (!quote) notFound();
  const teacher = await getTeacherById(quote.teacherId);
  if (!teacher) notFound();
  if (session_id) quote = (await getQuote(quoteId)) ?? quote;

  const expired =
    quote.status === "open" &&
    quote.expiresAt != null &&
    new Date(quote.expiresAt) < new Date();
  const price = formatPrice(quote.priceCents);
  const first = teacher.name.split(" ")[0];

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <Avatar name={teacher.name} src={teacher.avatarUrl} size={44} />
          <div>
            <p className="font-semibold [font-family:var(--font-display)] text-brand-dark">
              {teacher.name}
            </p>
            <p className="text-xs text-muted">sent you a quote via Kuleo 🧘</p>
          </div>
        </div>

        <div className="card">
          {quote.status === "paid" ? (
            <div className="text-center py-4">
              <p className="text-4xl mb-2">✅</p>
              <p className="font-semibold text-lg">Paid — thank you!</p>
              <p className="text-sm text-muted mt-1">
                Your payment of {price} to {teacher.name} is confirmed. Your
                receipt is on its way by email.
              </p>
              <div className="mt-4 rounded-lg border border-border p-3 text-left text-sm">
                <p className="font-medium">{quote.title}</p>
                <p className="text-muted">{price} · paid</p>
              </div>
            </div>
          ) : quote.status === "void" ? (
            <div className="text-center py-6 text-sm text-muted">
              This quote is no longer available. Reach out to {first} directly if
              you have questions.
            </div>
          ) : expired ? (
            <div className="text-center py-6 text-sm text-muted">
              This quote has expired. Ask {first} to send you a fresh one.
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold">{quote.title}</h1>
              {quote.description && (
                <p className="mt-2 text-sm text-muted whitespace-pre-line leading-relaxed">
                  {quote.description}
                </p>
              )}
              <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
                <span className="text-sm font-medium">Total</span>
                <span className="text-2xl font-semibold text-brand-dark [font-family:var(--font-display)]">
                  {price}
                </span>
              </div>
              <form action={payQuoteAction} className="mt-4">
                <input type="hidden" name="id" value={quote.id} />
                <button type="submit" className="btn-primary w-full">
                  Pay {price} securely →
                </button>
              </form>
              <p className="mt-3 text-center text-xs text-muted">
                🔒 Secure payment via Stripe. Reply to {first}&apos;s email with
                any questions.
              </p>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Powered by Kuleo 🧘
        </p>
      </div>
    </main>
  );
}
