"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the browser console (and any attached monitoring) so a real
    // error in production isn't silent.
    console.error("[app error]", error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <p className="text-5xl mb-4">🌀</p>
        <h1 className="text-2xl font-semibold [font-family:var(--font-display)] text-brand-dark">
          Something went sideways
        </h1>
        <p className="mt-2 text-muted">
          That&apos;s on us, not you. Try again — and if it keeps happening,
          reach out and we&apos;ll sort it fast.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button onClick={() => reset()} className="btn-primary">
            Try again
          </button>
          <Link href="/" className="btn-secondary">
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
