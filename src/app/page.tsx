import Link from "next/link";
import { getCurrentTeacher } from "@/lib/session";

export default async function Home() {
  const teacher = await getCurrentTeacher();

  return (
    <main className="min-h-screen">
      {/* Nav */}
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <span className="flex items-center gap-2 font-semibold text-brand-dark">
            <span className="text-xl">🧘</span> Kuleo
          </span>
          <nav className="flex items-center gap-3">
            <Link href="/teachers" className="btn-ghost text-sm hidden sm:inline-flex">
              Teachers
            </Link>
            <Link href="/schedule" className="btn-ghost text-sm hidden sm:inline-flex">
              Schedule
            </Link>
            {teacher ? (
              <Link href="/dashboard" className="btn-primary text-sm">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn-ghost text-sm">
                  Log in
                </Link>
                <Link href="/signup" className="btn-primary text-sm">
                  Start free
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 py-20 text-center">
        <span className="pill mb-5">For yoga teachers</span>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight max-w-3xl mx-auto leading-tight">
          The business side of teaching, finally handled.
        </h1>
        <p className="mt-5 text-lg text-muted max-w-xl mx-auto">
          Your profile, schedule, and payments in one calm place. Share a single
          link — students book and pay themselves. You just show up and teach.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href={teacher ? "/dashboard" : "/signup"} className="btn-primary">
            {teacher ? "Go to your studio" : "Create your studio — free"}
          </Link>
          <Link href="/login" className="btn-secondary">
            Log in
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted">
          No app store, no download. Works in any browser.
        </p>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 pb-20">
        <div className="grid sm:grid-cols-3 gap-4">
          <Feature
            icon="🪷"
            title="A profile that sells you"
            body="A clean public page with your story, specialties, and offerings — your one link for Instagram, email, everywhere."
          />
          <Feature
            icon="📅"
            title="Bookings on autopilot"
            body="Set your weekly availability once. Students pick from real open slots — no back-and-forth, no double-bookings."
          />
          <Feature
            icon="💳"
            title="Get paid to teach"
            body="Take payment at the moment of booking. (Payments are coming online next — powered by Stripe.)"
          />
        </div>
      </section>

      {/* How it works */}
      <section className="bg-brand-tint border-y border-border">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-2xl font-semibold text-center mb-10">
            Live in three steps
          </h2>
          <ol className="grid sm:grid-cols-3 gap-8">
            <Step n={1} title="Set up your studio" body="Add your profile, sessions, and prices in a few minutes." />
            <Step n={2} title="Set your hours" body="Tell Kuleo when you teach. We turn it into bookable times." />
            <Step n={3} title="Share your link" body="Post it anywhere. Students book and pay — you get the calendar entry." />
          </ol>
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-4 py-10 text-center text-sm text-muted">
        Kuleo 🧘 — the business OS for yoga teachers.
      </footer>
    </main>
  );
}

function Feature({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="card">
      <div className="text-2xl mb-3">{icon}</div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted leading-relaxed">{body}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="text-center">
      <div className="mx-auto mb-3 flex size-9 items-center justify-center rounded-full bg-brand text-white font-semibold">
        {n}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted">{body}</p>
    </li>
  );
}
