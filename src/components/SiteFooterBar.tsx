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
          <a
            href="https://www.instagram.com/kuleoyoga"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow Kuleo on Instagram"
            className="inline-flex items-center gap-1.5 text-muted hover:text-brand-dark transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-4 w-4"
              fill="currentColor"
            >
              <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 01-1.38-.9 3.72 3.72 0 01-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 1.62c-3.15 0-3.52.01-4.76.07-1.15.05-1.77.24-2.19.4-.55.22-.94.47-1.35.88-.41.41-.66.8-.88 1.35-.16.42-.35 1.04-.4 2.19-.06 1.24-.07 1.61-.07 4.76s.01 3.52.07 4.76c.05 1.15.24 1.77.4 2.19.22.55.47.94.88 1.35.41.41.8.66 1.35.88.42.16 1.04.35 2.19.4 1.24.06 1.61.07 4.76.07s3.52-.01 4.76-.07c1.15-.05 1.77-.24 2.19-.4.55-.22.94-.47 1.35-.88.41-.41.66-.8.88-1.35.16-.42.35-1.04.4-2.19.06-1.24.07-1.61.07-4.76s-.01-3.52-.07-4.76c-.05-1.15-.24-1.77-.4-2.19a3.63 3.63 0 00-.88-1.35 3.63 3.63 0 00-1.35-.88c-.42-.16-1.04-.35-2.19-.4-1.24-.06-1.61-.07-4.76-.07zm0 2.76a5.3 5.3 0 110 10.6 5.3 5.3 0 010-10.6zm0 1.62a3.68 3.68 0 100 7.36 3.68 3.68 0 000-7.36zm5.5-2.91a1.24 1.24 0 110 2.48 1.24 1.24 0 010-2.48z" />
            </svg>
            <span className="hidden sm:inline">Follow</span>
          </a>
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
