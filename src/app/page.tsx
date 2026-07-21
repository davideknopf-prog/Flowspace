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
                  Get started
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
          Grow your yoga business without growing your workload.
        </h1>
        <p className="mt-5 text-lg text-muted max-w-2xl mx-auto">
          Kuleo gives yoga teachers one calm place to run their online yoga
          business — bookings, payments, scheduling, and student relationships,
          all from a single link you share. You teach. We&apos;ll handle the rest.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href={teacher ? "/dashboard" : "/signup"} className="btn-primary">
            {teacher ? "Go to your studio" : "Create your studio"}
          </Link>
          <Link href="/login" className="btn-secondary">
            Log in
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted">
          No commission on your classes · nothing to download · cancel anytime.
        </p>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 pb-20">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="text-2xl font-semibold">Less admin. More teaching.</h2>
          <p className="mt-2 text-muted">
            You didn&apos;t train for years to chase payments and answer booking
            DMs. Kuleo quietly runs the parts of your business that pull you off
            the mat.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Feature
            icon="🪷"
            title="Turn followers into students"
            body="Your classes, story, and prices live on one link built for your Instagram bio. Visitors see your next open times the moment they land — and book on the spot."
          />
          <Feature
            icon="📅"
            title="Scheduling that runs itself"
            body="Set your weekly hours once. Kuleo turns them into bookable times for your online yoga classes or in-person sessions — no DMs, no double-bookings, no back-and-forth."
          />
          <Feature
            icon="💳"
            title="Keep what you earn"
            body="Students pay securely when they book, with class passes built in. Kuleo never takes a cut of your classes — you keep every dollar you teach for."
          />
        </div>
      </section>

      {/* How it works */}
      <section className="bg-brand-tint border-y border-border">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-2xl font-semibold text-center mb-3">
            Set up this afternoon. Booked by this week.
          </h2>
          <p className="text-center text-muted max-w-lg mx-auto mb-10">
            No developer, no app store, no learning curve — just your online yoga
            business, ready to take bookings.
          </p>
          <ol className="grid sm:grid-cols-3 gap-8">
            <Step n={1} title="Build your studio" body="Add your classes, prices, and hours. It takes minutes, not a weekend." />
            <Step n={2} title="Share one link" body="Drop it in your bio, emails, and DMs — your yoga scheduling and payments, open around the clock." />
            <Step n={3} title="Just teach" body="Students book and pay themselves. You show up to a full schedule and do what you love." />
          </ol>
        </div>
      </section>

      {/* Why we built Kuleo — founder note */}
      <section className="mx-auto max-w-2xl px-4 py-20">
        <div className="text-center mb-8">
          <span className="pill mb-4">Why we built Kuleo</span>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Teachers are the heart of yoga. They should be paid like it.
          </h2>
        </div>
        <div className="space-y-4 text-muted leading-relaxed">
          <p>
            I&apos;ve practiced yoga for ten years, and some of the best moments
            of my life have happened in a class or on a retreat. The teachers who
            led them became some of the most important people in my world — the
            ones who helped me deepen my practice and expand how I see everything.
          </p>
          <p>
            So it&apos;s never sat right with me how little they earn. The teacher
            is the reason anyone shows up — yet the way the industry is built, too
            much of the money goes to the studio. I spent my career in enterprise
            tech sales, and I kept landing on the same thought: the people
            creating all the value deserve tools, and earnings, that match it.
          </p>
          <p>
            Kuleo is my answer. It&apos;s built to help teachers keep more of what
            they earn, fill their classes, and truly connect with their students —
            whether they&apos;re across town or across the world. Less time lost to
            admin, more freedom in your schedule, and a bigger stage for your
            message.
          </p>
          <p>
            The vision is simple: make great yoga more accessible to everyone, and
            help the teachers who share it earn far more, with the freedom to reach
            more people their own way. This one&apos;s inspired by my own teacher,
            Alex.
          </p>
        </div>
        <p className="mt-6 font-medium text-foreground">— David, founder of Kuleo</p>
        <div className="mt-8 text-center">
          <Link href={teacher ? "/dashboard" : "/signup"} className="btn-primary">
            {teacher ? "Go to your studio" : "Create your studio"}
          </Link>
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-4 py-10 text-center text-sm text-muted">
        Kuleo 🧘 — the online home for your yoga business. Teach yoga; we&apos;ll
        handle the rest.
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
