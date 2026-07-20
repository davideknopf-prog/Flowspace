import Link from "next/link";
import { loginAction } from "../actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 justify-center text-brand-dark font-semibold text-lg"
        >
          <span className="text-2xl">🧘</span> Flowspace
        </Link>
        <div className="card">
          <h1 className="text-xl font-semibold mb-1">Welcome back</h1>
          <p className="text-sm text-muted mb-6">
            Log in to manage your profile, schedule, and bookings.
          </p>
          {error && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          <form action={loginAction} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoFocus
                placeholder="you@studio.com"
                className="input"
              />
            </div>
            <button type="submit" className="btn-primary w-full">
              Log in
            </button>
          </form>
          <p className="mt-4 text-xs text-muted">
            Demo login — no password needed yet. Real auth (Clerk) drops in
            later without changing these screens.
          </p>
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          New here?{" "}
          <Link href="/signup" className="text-brand-dark font-medium underline">
            Create your studio
          </Link>
        </p>
      </div>
    </main>
  );
}
