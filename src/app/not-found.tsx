import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <p className="text-5xl mb-4">🧘</p>
        <h1 className="text-2xl font-semibold [font-family:var(--font-display)] text-brand-dark">
          This page wandered off
        </h1>
        <p className="mt-2 text-muted">
          The link may be old or mistyped. Let&apos;s get you back on the mat.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="btn-primary">
            Go home
          </Link>
          <Link href="/teachers" className="btn-secondary">
            Browse teachers
          </Link>
        </div>
      </div>
    </main>
  );
}
