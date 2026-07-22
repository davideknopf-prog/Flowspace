import Link from "next/link";

// Compact legal footer for public pages that don't have the landing page's
// full four-column footer.
export function LegalFooter() {
  return (
    <footer className="border-t border-border mt-8">
      <div className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-muted space-y-2">
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <Link href="/waiver" className="hover:text-foreground">Liability Waiver</Link>
        </nav>
        <p>Kuleo 🧘 — great yoga, straight from the teacher.</p>
      </div>
    </footer>
  );
}
