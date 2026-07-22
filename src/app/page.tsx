import Link from "next/link";
import { getCurrentTeacher } from "@/lib/session";
import { getPlans, type Plan } from "@/lib/billing";
import { formatPrice } from "@/lib/format";

const CALENDLY_URL = "https://calendly.com/david-knopf/onboarding-meeting";
const PHONE_DISPLAY = "(508) 468-7829";
const PHONE_HREF = "tel:+15084687829";

export default async function Home() {
  const teacher = await getCurrentTeacher();
  // Real prices from Stripe; a hiccup there shouldn't take down the landing
  // page, so fall back to the known amounts.
  let plans: Plan[] = [];
  try {
    plans = await getPlans();
  } catch {
    plans = [
      { lookupKey: "kuleo_weekly", priceId: "", amountCents: 750, interval: "week" },
      { lookupKey: "kuleo_monthly", priceId: "", amountCents: 1500, interval: "month" },
      { lookupKey: "kuleo_annual", priceId: "", amountCents: 9000, interval: "year" },
    ];
  }

  return (
    <main className="min-h-screen">
      {/* Nav */}
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <span className="flex items-center gap-2 font-semibold text-brand-dark">
            <span className="text-xl">🧘</span> Kuleo
          </span>
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
            <Link href="/#pricing" className="btn-ghost text-sm hidden sm:inline-flex">
              Pricing
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
        <p className="mt-6 text-sm text-muted">
          Want a walkthrough first?{" "}
          <a
            href={CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-dark font-medium underline underline-offset-2"
          >
            Book a free demo
          </a>{" "}
          or call/text David directly at{" "}
          <a href={PHONE_HREF} className="text-brand-dark font-medium">
            {PHONE_DISPLAY}
          </a>
          .
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

      {/* Pricing — outcomes first, then the numbers */}
      <section id="pricing" className="mx-auto max-w-5xl px-4 py-20 scroll-mt-16">
        <div className="text-center max-w-2xl mx-auto mb-4">
          <span className="pill mb-4">Pricing — for teachers</span>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            One flat subscription. Everything you earn is yours.
          </h2>
          <p className="mt-3 text-muted">
            This is what <span className="font-medium text-foreground">teachers</span>{" "}
            pay to run their studio on Kuleo. Students never pay Kuleo anything —
            they just pay you for your classes.
          </p>
        </div>

        {/* The outcomes — the dream before the feature list */}
        <div className="grid sm:grid-cols-3 gap-4 mt-10 mb-10">
          <Outcome icon="📈" title="A full schedule" body="Teachers use Kuleo to fill 10+ bookings a week from one link in their bio — while they sleep, not while they DM." />
          <Outcome icon="💸" title="No studio fees. Keep all your earnings." body="Zero commission on your classes. Every dollar a student pays you is yours — Kuleo never takes a cut." />
          <Outcome icon="🌍" title="A global audience" body="Teach students across town or across the world. Your studio is open around the clock, wherever you are." />
          <Outcome icon="🧘" title="Tech, simplified" body="Bookings, payments, scheduling, reminders — quietly handled. You didn't train for years to do admin." />
          <Outcome icon="🎓" title="Free onboarding & training" body="We set up your studio with you, one on one, and stay in your corner as you grow. Included, always." />
          <Outcome icon="🤝" title="Students who come back" body="Class passes, reviews, and a student list that helps your regulars stay regulars." />
        </div>

        {/* The numbers + what's inside */}
        <div className="grid md:grid-cols-[1fr_1.2fr] gap-6 items-start">
          <div className="space-y-3">
            {plans.map((p) => {
              const copy: Record<string, { label: string; note: string; highlight?: boolean }> = {
                kuleo_weekly: { label: "Weekly", note: "Great for trying things out." },
                kuleo_monthly: { label: "Monthly", note: "Most popular with teachers.", highlight: true },
                kuleo_annual: { label: "Annual", note: "Two months free vs. monthly." },
              };
              const c = copy[p.lookupKey] ?? { label: p.lookupKey, note: "" };
              return (
                <div
                  key={p.lookupKey}
                  className={`card !p-4 flex items-center justify-between ${
                    c.highlight ? "border-brand" : ""
                  }`}
                >
                  <div>
                    <p className="font-semibold">
                      {c.label}
                      {c.highlight && (
                        <span className="ml-2 rounded-full bg-brand-tint px-2 py-0.5 text-xs font-medium text-brand-dark">
                          Most popular
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted">{c.note}</p>
                  </div>
                  <p className="text-xl font-semibold">
                    {formatPrice(p.amountCents)}
                    <span className="text-sm font-normal text-muted">/{p.interval}</span>
                  </p>
                </div>
              );
            })}
            <Link
              href={teacher ? "/dashboard" : "/signup"}
              className="btn-primary w-full text-center"
            >
              {teacher ? "Go to your studio" : "Start your studio today"}
            </Link>
            <p className="text-center text-xs text-muted">
              Cancel anytime · your earnings are always yours to cash out.
            </p>
          </div>

          <div className="card">
            <p className="font-semibold mb-3">Every plan includes the whole studio:</p>
            <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted">
              <Included>Your own studio page & booking link</Included>
              <Included>Scheduling that runs itself</Included>
              <Included>Secure student payments (Stripe)</Included>
              <Included>Class passes & intro offers</Included>
              <Included>Earnings dashboard & easy cash-out</Included>
              <Included>Student list with your top fans</Included>
              <Included>Reviews on your public page</Included>
              <Included>Booking confirmations & emails</Included>
              <Included>Online & in-person classes</Included>
              <Included>Placement on the studio schedule</Included>
            </ul>
            <div className="mt-5 rounded-lg bg-brand-tint/50 p-4 text-sm">
              <p className="font-medium">Rather see it before you decide?</p>
              <p className="text-muted mt-1">
                <a
                  href={CALENDLY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-dark font-medium underline underline-offset-2"
                >
                  Book a free 1-on-1 demo
                </a>{" "}
                with David, Kuleo&apos;s founder — or call/text him at{" "}
                <a href={PHONE_HREF} className="text-brand-dark font-medium">
                  {PHONE_DISPLAY}
                </a>
                . He&apos;ll set up your studio with you.
              </p>
            </div>
          </div>
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

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-10 text-center text-sm text-muted space-y-3">
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href="/students" className="hover:text-foreground">New students</Link>
            <Link href="/teachers" className="hover:text-foreground">Our teachers</Link>
            <Link href="/schedule" className="hover:text-foreground">Today&apos;s classes</Link>
            <Link href="/#pricing" className="hover:text-foreground">Pricing</Link>
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              Book a demo
            </a>
          </nav>
          <p>
            Questions? Call or text David at{" "}
            <a href={PHONE_HREF} className="text-brand-dark font-medium">
              {PHONE_DISPLAY}
            </a>
          </p>
          <p>
            Kuleo 🧘 — the online home for your yoga business. Teach yoga;
            we&apos;ll handle the rest.
          </p>
        </div>
      </footer>
    </main>
  );
}

function Outcome({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="card !p-4">
      <div className="text-xl mb-2">{icon}</div>
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted leading-relaxed">{body}</p>
    </div>
  );
}

function Included({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-brand-dark mt-0.5">✓</span>
      {children}
    </li>
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
