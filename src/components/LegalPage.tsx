import Link from "next/link";

// Shared shell for legal documents: consistent header, readable measure,
// muted prose styling.
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-lg text-brand-dark [font-family:var(--font-display)]"
          >
            <span className="text-xl">🧘</span> Kuleo
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/terms" className="btn-ghost text-sm">Terms</Link>
            <Link href="/privacy" className="btn-ghost text-sm">Privacy</Link>
            <Link href="/waiver" className="btn-ghost text-sm">Waiver</Link>
          </nav>
        </div>
      </header>
      <article className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-3xl font-semibold mb-1">{title}</h1>
        <p className="text-sm text-muted mb-8">Last updated: {updated}</p>
        <div className="space-y-6 text-[15px] leading-relaxed text-foreground/90 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-2 [&_p]:text-muted [&_li]:text-muted [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          {children}
        </div>
        <p className="mt-12 pt-6 border-t border-border text-sm text-muted">
          Questions about this document? Contact us at{" "}
          <a href="mailto:upshiftsolutionsllc@gmail.com" className="text-brand-dark font-medium">
            upshiftsolutionsllc@gmail.com
          </a>{" "}
          or call/text (508) 468-7829.
        </p>
      </article>
    </main>
  );
}
