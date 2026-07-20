import Link from "next/link";
import { signupAction } from "../actions";

export default async function SignupPage({
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
          <h1 className="text-xl font-semibold mb-1">Create your studio</h1>
          <p className="text-sm text-muted mb-6">
            Two fields and you&apos;re in. Set up the rest inside.
          </p>
          {error && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          <form action={signupAction} className="space-y-4">
            <div>
              <label className="label" htmlFor="name">
                Your name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoFocus
                placeholder="Jane Rivera"
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@studio.com"
                className="input"
              />
            </div>
            <button type="submit" className="btn-primary w-full">
              Create studio
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          Already have a studio?{" "}
          <Link href="/login" className="text-brand-dark font-medium underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
