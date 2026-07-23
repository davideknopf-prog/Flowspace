import Link from "next/link";
import { AuthNavButtons } from "./AuthNavButtons";

// The one public-site header, identical on every page: brand → the four
// destinations → auth. Auth buttons resolve client-side so cached (ISR)
// pages can share this header without going dynamic.
export function SiteHeader() {
  return (
    <header className="border-b border-border bg-brand-tint/90 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-lg text-brand-dark [font-family:var(--font-display)]"
        >
          <span className="text-xl">🧘</span> Kuleo
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/students" className="btn-ghost text-sm hidden md:inline-flex">
            New students
          </Link>
          <Link href="/teachers" className="btn-ghost text-sm hidden sm:inline-flex">
            Our teachers
          </Link>
          <Link href="/schedule" className="btn-ghost text-sm hidden sm:inline-flex">
            Today&apos;s classes
          </Link>
          <Link href="/#pricing" className="btn-ghost text-sm hidden lg:inline-flex">
            Pricing
          </Link>
          <AuthNavButtons />
        </nav>
      </div>
    </header>
  );
}
