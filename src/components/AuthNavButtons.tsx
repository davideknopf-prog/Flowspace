"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";

// Client-side auth buttons so the shared header works on statically cached
// pages: signed-out is the prerendered default; signed-in teachers see
// "Go to dashboard" after hydration.
export function AuthNavButtons() {
  const { isSignedIn } = useUser();

  if (isSignedIn) {
    return (
      <Link href="/dashboard" className="btn-primary text-sm">
        Go to dashboard
      </Link>
    );
  }
  return (
    <>
      <Link href="/login" className="btn-ghost text-sm hidden sm:inline-flex">
        Log in
      </Link>
      <Link href="/signup" className="btn-primary text-sm">
        Get started
      </Link>
    </>
  );
}
