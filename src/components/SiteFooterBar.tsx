import Link from "next/link";

// Slim companion to SiteHeader: pinned to the bottom of the viewport while
// scrolling (sticky, so it settles naturally above the full footer at page
// end). Same sage-tint surface as the header.
export function SiteFooterBar() {
  return (
    <div className="sticky bottom-0 z-10 border-t border-border bg-brand-tint/90 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 h-12 flex items-center justify-between gap-3">
        <nav className="flex items-center gap-x-4 overflow-x-auto whitespace-nowrap text-sm">
          <Link href="/students" className="text-muted hover:text-foreground">
            New students
          </Link>
          <Link href="/teachers" className="text-muted hover:text-foreground">
            Our teachers
          </Link>
          <Link href="/schedule" className="text-muted hover:text-foreground">
            Today&apos;s classes
          </Link>
          <Link href="/#pricing" className="text-muted hover:text-foreground">
            Pricing
          </Link>
          <Link href="/guide" className="text-muted hover:text-foreground hidden sm:inline">
            Free guide
          </Link>
          <Link href="/demo" className="text-muted hover:text-foreground hidden md:inline">
            Live demo
          </Link>
        </nav>
        <a
          href="https://calendly.com/david-knopf/onboarding-meeting"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary !py-1.5 text-xs shrink-0 hidden sm:inline-flex"
        >
          Book a demo
        </a>
      </div>
    </div>
  );
}
