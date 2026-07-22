import Link from "next/link";
import { getCurrentTeacher } from "@/lib/session";
import { getPlans, type Plan } from "@/lib/billing";
import { getStudioSchedule, type StudioEntry } from "@/lib/studio";
import { Avatar } from "@/components/Avatar";
import { formatPrice, formatDuration } from "@/lib/format";

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

  // Live marketplace proof: real upcoming classes and honest platform stats.
  // A database hiccup degrades to hiding these sections, never a broken page.
  let upcoming: StudioEntry[] = [];
  let weekClassCount = 0;
  let teacherCount = 0;
  try {
    const studio = await getStudioSchedule(100);
    upcoming = studio.entries.slice(0, 4);
    weekClassCount = studio.entries.length;
    teacherCount = studio.teachers.length;
  } catch {
    // sections render conditionally below
  }

  return (
    <main className="min-h-screen">
      {/* Nav */}
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <span className="flex items-center gap-2 font-semibold text-lg text-brand-dark [font-family:var(--font-display)]">
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
      <section className="hero-glow border-b border-border/60">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:py-16 text-center">
        <span className="pill mb-5">For yoga teachers</span>
        <h1 className="animate-fade-up text-4xl sm:text-6xl font-semibold tracking-tight max-w-3xl mx-auto leading-tight">
          Grow your yoga business{" "}
          <em className="text-brand-dark">without</em> growing your workload.
        </h1>
        <p className="animate-fade-up mt-5 text-lg text-muted max-w-2xl mx-auto">
          Kuleo gives yoga teachers one calm place to run their online yoga
          business — bookings, payments, scheduling, and student relationships,
          all from a single link you share. You teach. We&apos;ll handle the rest.
        </p>
        <div className="animate-fade-up mt-8 flex items-center justify-center gap-3">
          <Link href={teacher ? "/dashboard" : "/signup"} className="btn-primary">
            {teacher ? "Go to your studio" : "Kick off your studio"}
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

        {/* Two doors in: every marketplace routes both sides on screen one. */}
        <div className="animate-fade-up-late mt-10 grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
          <Link
            href={teacher ? "/dashboard" : "/signup"}
            className="card card-lift !p-5 hover:border-brand"
          >
            <div className="text-2xl mb-2">🧘</div>
            <p className="font-semibold">I&apos;m here to teach</p>
            <p className="text-sm text-muted mt-1">
              Open your studio, share one link, and keep everything you earn.
            </p>
            <p className="text-sm text-brand-dark font-medium mt-3">
              Kick off your studio →
            </p>
          </Link>
          <Link
            href="/students"
            className="card card-lift !p-5 hover:border-brand"
          >
            <div className="text-2xl mb-2">✨</div>
            <p className="font-semibold">I&apos;m here to practice</p>
            <p className="text-sm text-muted mt-1">
              Book live classes with independent, verified teachers — online or
              in person.
            </p>
            <p className="text-sm text-brand-dark font-medium mt-3">
              Find your class →
            </p>
          </Link>
        </div>

        {/* Honest, live numbers beat borrowed big ones. */}
        {teacherCount > 0 && (
          <p className="mt-8 text-sm text-muted">
            <span className="font-semibold text-foreground">{teacherCount}</span>{" "}
            verified teacher{teacherCount === 1 ? "" : "s"} ·{" "}
            <span className="font-semibold text-foreground">{weekClassCount}</span>{" "}
            bookable class{weekClassCount === 1 ? "" : "es"} this week ·{" "}
            <span className="font-semibold text-foreground">100%</span> of class
            earnings go to teachers
          </p>
        )}
        </div>
      </section>

      {/* Live inventory: the realest trust signal a marketplace has. */}
      {upcoming.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 pt-12 pb-14">
          <div className="flex items-end justify-between mb-5">
            <h2 className="heading-flourish text-2xl font-semibold">Happening this week</h2>
            <Link href="/schedule" className="text-sm text-brand-dark font-medium">
              Full schedule →
            </Link>
          </div>
          <ul className="space-y-2">
            {upcoming.map((e, i) => (
              <li key={e.bookHref + i}>
                <Link
                  href={e.bookHref}
                  className="card card-lift !p-4 flex items-center gap-4 hover:border-brand"
                >
                  <div className="w-36 shrink-0 text-sm font-semibold">
                    {e.dayHeading} · {e.timeLabel}
                  </div>
                  <Avatar name={e.teacherName} src={e.teacherAvatar} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {e.className}{" "}
                      <span className="text-muted font-normal">· {e.teacherName}</span>
                    </p>
                    <p className="text-xs text-muted">
                      {formatDuration(e.durationMinutes)} ·{" "}
                      {e.locationType === "online" ? "💻 Online" : "📍 In person"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold">{formatPrice(e.priceCents)}</p>
                    <span className="text-xs text-brand-dark">Book →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 pb-14">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="heading-flourish heading-flourish-center text-2xl sm:text-3xl font-semibold">Less admin. More teaching.</h2>
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
        <div className="mx-auto max-w-5xl px-4 py-12">
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
      <section id="pricing" className="mx-auto max-w-5xl px-4 py-14 scroll-mt-16">
        <div className="text-center max-w-2xl mx-auto mb-4">
          <span className="pill-accent mb-4">Pricing — for teachers</span>
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
        <div className="grid sm:grid-cols-3 gap-4 mt-8 mb-8">
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
              {teacher ? "Go to your studio" : "Get booking today"}
            </Link>
            <p className="text-center text-xs text-muted">
              Cancel anytime · your earnings are always yours to cash out.
            </p>
            <p className="text-center text-xs text-muted">
              Kuleo takes no commission. Standard card processing (2.9% + 30¢,
              charged by the payment processor) applies to student payments.
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
      <section className="mx-auto max-w-2xl px-4 py-14">
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
            {teacher ? "Go to your studio" : "Kick off your studio"}
          </Link>
        </div>
      </section>

      <footer className="border-t border-border bg-surface/50">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 text-sm">
            <div>
              <p className="flex items-center gap-2 font-semibold text-lg text-brand-dark mb-3 [font-family:var(--font-display)]">
                <span className="text-xl">🧘</span> Kuleo
              </p>
              <p className="text-muted leading-relaxed">
                The online home for your yoga business. Teach yoga; we&apos;ll
                handle the rest.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-3">For teachers</p>
              <ul className="space-y-2 text-muted">
                <li><Link href="/#pricing" className="hover:text-foreground">Pricing</Link></li>
                <li><Link href="/signup" className="hover:text-foreground">Create your studio</Link></li>
                <li><Link href="/login" className="hover:text-foreground">Log in</Link></li>
                <li>
                  <a
                    href={CALENDLY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground"
                  >
                    Book a free demo
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-3">For students</p>
              <ul className="space-y-2 text-muted">
                <li><Link href="/students" className="hover:text-foreground">New to Kuleo?</Link></li>
                <li><Link href="/schedule" className="hover:text-foreground">Today&apos;s classes</Link></li>
                <li><Link href="/teachers" className="hover:text-foreground">Our teachers</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-3">Talk to a human</p>
              <ul className="space-y-2 text-muted">
                <li>
                  Call or text David:{" "}
                  <a href={PHONE_HREF} className="text-brand-dark font-medium whitespace-nowrap">
                    {PHONE_DISPLAY}
                  </a>
                </li>
                <li>
                  <a
                    href={CALENDLY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-dark font-medium"
                  >
                    Schedule a 1-on-1 →
                  </a>
                </li>
                <li className="text-xs">
                  Real founder, real phone. Free onboarding &amp; training with
                  every plan.
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-border text-center text-xs text-muted space-y-2">
            <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
              <Link href="/waiver" className="hover:text-foreground">Liability Waiver</Link>
            </nav>
            <p>Kuleo 🧘 — great yoga, straight from the teacher.</p>
          </div>
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
