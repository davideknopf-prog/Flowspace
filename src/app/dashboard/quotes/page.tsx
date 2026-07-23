import { getCurrentTeacher } from "@/lib/session";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { listQuotes } from "@/lib/repo";
import { formatPrice } from "@/lib/format";
import { CopyLink } from "@/components/CopyLink";
import { createQuoteAction, voidQuoteAction } from "../actions";

const STATUS = {
  open: { label: "Awaiting payment", tone: "bg-amber-100 text-amber-800" },
  paid: { label: "Paid", tone: "bg-green-100 text-green-800" },
  void: { label: "Void", tone: "bg-gray-100 text-gray-600" },
} as const;

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  const { created, error } = await searchParams;

  const quotes = await listQuotes(teacher.id);
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const origin = `${proto}://${host}`;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Custom quotes</h1>
        <p className="text-muted text-sm">
          Someone wants to hire you for a private class, party, or workshop?
          Build a quote, send the link, get paid — no public class needed. Paid
          quotes land in your earnings.
        </p>
      </div>

      {created && (
        <div className="card border-brand bg-brand-tint/50">
          <p className="font-semibold text-sm mb-2">✅ Quote created — share this link:</p>
          <CopyLink url={`${origin}/q/${created}`} />
          <p className="text-xs text-muted mt-2">
            Text or email it to your client. If you added their email, we&apos;ve
            already sent it.
          </p>
        </div>
      )}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
          {decodeURIComponent(error).replace(/\+/g, " ")}
        </p>
      )}

      {/* Build a quote */}
      <form action={createQuoteAction} className="card space-y-4">
        <p className="font-medium text-sm">Build a quote</p>
        <div>
          <label className="label" htmlFor="title">What&apos;s it for?</label>
          <input
            id="title"
            name="title"
            required
            placeholder="Private beach yoga party (up to 15 people)"
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="description">Details (optional)</label>
          <textarea
            id="description"
            name="description"
            placeholder="90-minute all-levels flow, I bring mats and props, travel within 20 miles included…"
            className="textarea"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="price">Price (USD)</label>
            <input
              id="price"
              name="price"
              type="number"
              min={1}
              step="0.01"
              placeholder="350"
              required
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="validDays">Expires in (days)</label>
            <input
              id="validDays"
              name="validDays"
              type="number"
              min={0}
              placeholder="No expiry"
              className="input"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="clientName">Client name (optional)</label>
            <input id="clientName" name="clientName" placeholder="Jamie" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="clientEmail">Client email (optional)</label>
            <input
              id="clientEmail"
              name="clientEmail"
              type="email"
              placeholder="jamie@example.com"
              className="input"
            />
            <p className="hint">If set, we email them the quote for you.</p>
          </div>
        </div>
        <button type="submit" className="btn-primary">Create quote &amp; get link</button>
      </form>

      {/* Existing quotes */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your quotes</h2>
        {quotes.length === 0 ? (
          <div className="card text-center py-8 text-sm text-muted">
            No quotes yet. Build your first one above.
          </div>
        ) : (
          <ul className="space-y-2">
            {quotes.map((q) => {
              const st = STATUS[q.status];
              return (
                <li key={q.id} className="card !p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{q.title}</p>
                      <p className="text-sm text-muted">
                        {formatPrice(q.priceCents)}
                        {q.clientName ? ` · ${q.clientName}` : ""}
                        {q.clientEmail ? ` · ${q.clientEmail}` : ""}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${st.tone}`}>
                      {st.label}
                    </span>
                  </div>
                  {q.status === "open" && (
                    <div className="border-t border-border pt-3 space-y-2">
                      <CopyLink url={`${origin}/q/${q.id}`} />
                      <form action={voidQuoteAction}>
                        <input type="hidden" name="id" value={q.id} />
                        <button type="submit" className="btn-ghost text-xs text-danger px-0">
                          Void this quote
                        </button>
                      </form>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
