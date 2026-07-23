import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooterBar } from "@/components/SiteFooterBar";
import { getCurrentTeacher } from "@/lib/session";
import { getPlans, type Plan } from "@/lib/billing";
import { getStudioSchedule, type StudioEntry } from "@/lib/studio";
import { pickDemoTeacher, getDemoSnapshot, type DemoSnapshot } from "@/lib/demo";
import { Avatar } from "@/components/Avatar";
import { formatPrice, formatDuration, formatMoney } from "@/lib/format";

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

  // Live demo snapshot — a real teacher's real numbers, embedded on the home
  // page (show, don't tell). Degrades to hidden if unavailable.
  let demo: DemoSnapshot | null = null;
  try {
    const demoTeacher = await pickDemoTeacher();
    if (demoTeacher) demo = await getDemoSnapshot(demoTeacher);
  } catch {
    // section hidden below
  }

  return (
    <main className="min-h-screen">
      {/* Nav */}
      <SiteHeader />

      {/* Hero */}
      <section className="hero-glow border-b border-border/60">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:py-16 text-center">
        <span className="pill-accent mb-5">Like Mindbody — rebuilt for the solo teacher</span>
        <h1 className="animate-fade-up text-4xl sm:text-6xl font-semibold tracking-tight max-w-4xl mx-auto leading-tight">
          The operating system for{" "}
          <em className="text-brand-dark">independent</em> yoga teachers.
        </h1>
        <p className="animate-fade-up mt-5 text-lg text-muted max-w-2xl mx-auto">
          Your own studio, run from one link: scheduled classes, bookings,
          payments, passes, and student follow-ups — all automatic, with{" "}
          <span className="font-semibold text-foreground">zero commission</span>.
          You teach. Kuleo runs the business.
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
        <p className="mt-3 text-sm">
          <Link href="/demo" className="text-brand-dark font-medium underline underline-offset-2">
            👀 Peek inside a live teacher&apos;s dashboard →
          </Link>
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
        <p className="mt-6 text-base text-muted italic [font-family:var(--font-display)]">
          Our mission is simple: make yoga available to everyone —{" "}
          <span className="text-brand-dark">by making it pay to teach.</span>
        </p>
        </div>
      </section>

      {/* Live inventory: the realest trust signal a marketplace has. */}
      {upcoming.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pt-12 pb-14">
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
      <section className="mx-auto max-w-7xl px-4 pb-14">
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
        <div className="mx-auto max-w-7xl px-4 py-12">
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

      {/* Live demo embed — a real teacher's real numbers. Show, don't tell. */}
      {demo && demo.earnedCents > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-14">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="pill-accent mb-4">A real Kuleo studio</span>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              This is what a studio on Kuleo looks like.
            </h2>
            <p className="mt-3 text-muted">
              A live look at {demo.teacher.name.split(" ")[0]}&apos;s dashboard —
              real classes, real passes, real earnings. No mockups.
            </p>
          </div>

          {/* Framed mini-dashboard */}
          <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface shadow-[0_10px_40px_-15px_rgba(38,33,28,0.2)] overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border bg-brand-tint/50 px-4 py-2">
              <span className="size-2.5 rounded-full bg-danger/60" />
              <span className="size-2.5 rounded-full bg-accent/60" />
              <span className="size-2.5 rounded-full bg-brand/60" />
              <span className="ml-2 text-xs text-muted">
                {demo.teacher.name}&apos;s studio · Kuleo dashboard
              </span>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <DemoStat label="This week" value={formatMoney(demo.thisWeekCents)} accent />
                <DemoStat label="Ready to cash out" value={formatMoney(demo.availableCents)} />
                <DemoStat label="Students" value={String(demo.studentCount)} />
                <DemoStat label="Pass holders" value={String(demo.passHolders)} />
              </div>
              <div className="mt-4 card !p-4">
                <p className="text-xs text-muted">Earned all-time</p>
                <p className="text-3xl font-semibold [font-family:var(--font-display)] text-brand-dark">
                  {formatMoney(demo.earnedCents)}
                </p>
                <div className="mt-3 flex items-end gap-1 h-10">
                  {demo.weekly.map((w, i) => {
                    const max = Math.max(1, ...demo!.weekly.map((x) => x.netCents));
                    const pct = Math.round((w.netCents / max) * 100);
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-brand/70"
                        style={{ height: `${Math.max(4, pct)}%` }}
                      />
                    );
                  })}
                </div>
                <p className="text-xs text-muted mt-2">Net earnings, last 8 weeks</p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center flex flex-wrap items-center justify-center gap-3">
            <Link href="/demo" className="btn-primary">
              Explore the full live dashboard →
            </Link>
            <Link href={teacher ? "/dashboard" : "/signup"} className="btn-secondary">
              {teacher ? "Go to your studio" : "Start yours"}
            </Link>
          </div>

          {/* Free guide — kept, relocated here */}
          <div className="mt-10 mx-auto max-w-xl card !p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold">📖 Free guide: The Yoga Teacher Economy</p>
              <p className="text-xs text-muted">
                The real numbers behind studio pay — and the first-year math of
                owning your room. No email required.
              </p>
            </div>
            <Link href="/guide" className="btn-secondary text-sm shrink-0">
              Read it →
            </Link>
          </div>
        </section>
      )}

      {/* Guide fallback when the demo embed is hidden (thin data). */}
      {!(demo && demo.earnedCents > 0) && (
        <section className="mx-auto max-w-5xl px-4 py-14">
          <div className="mx-auto max-w-xl card !p-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold">📖 Free guide: The Yoga Teacher Economy</p>
              <p className="text-sm text-muted mt-1">
                The real numbers behind studio pay — and the first-year math of
                owning your room. No email required.
              </p>
            </div>
            <Link href="/guide" className="btn-secondary text-sm shrink-0">
              Read it →
            </Link>
          </div>
        </section>
      )}

      {/* Pricing — anchored, juxtaposed, one click from checkout */}
      <section id="pricing" className="mx-auto max-w-7xl px-4 py-14 scroll-mt-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="pill-accent mb-4">Pricing — for teachers</span>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            One student covers it.<br />Everything else is yours.
          </h2>
          <p className="mt-4 text-lg text-muted">
            A single $25 booking pays for <em className="text-foreground">more than
            a month</em> of Kuleo. Zero commission — students pay{" "}
            <span className="font-semibold text-foreground">you</span>, never us.
          </p>
        </div>

        {/* Pick a plan → account → checkout. Three clicks, live today. */}
        <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto items-stretch">
          {plans.map((p) => {
            const copy: Record<string, { label: string; anchor: string; cta: string; highlight?: boolean }> = {
              kuleo_weekly: {
                label: "Weekly",
                anchor: "Less than a latte. Zero commitment.",
                cta: "Start weekly",
              },
              kuleo_monthly: {
                label: "Monthly",
                anchor: "One $25 student covers it — with change.",
                cta: "Start monthly",
                highlight: true,
              },
              kuleo_annual: {
                label: "Annual",
                anchor: "Two months free. Fully committed.",
                cta: "Start annual",
              },
            };
            const c = copy[p.lookupKey] ?? { label: p.lookupKey, anchor: "", cta: "Start" };
            return (
              <Link
                key={p.lookupKey}
                href={`/subscribe/start?plan=${p.lookupKey}`}
                className={`card card-lift !p-6 flex flex-col text-center relative ${
                  c.highlight ? "border-brand ring-2 ring-[var(--ring)]" : ""
                }`}
              >
                {c.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-[11px] font-semibold text-white whitespace-nowrap">
                    MOST POPULAR
                  </span>
                )}
                <p className="font-semibold text-muted">{c.label}</p>
                <p className="mt-2 text-4xl font-semibold [font-family:var(--font-display)] text-foreground">
                  {formatPrice(p.amountCents)}
                  <span className="text-base font-normal text-muted [font-family:var(--font-sans)]">
                    /{p.interval}
                  </span>
                </p>
                <p className="mt-2 text-sm text-muted flex-1">{c.anchor}</p>
                <span
                  className={`mt-4 ${c.highlight ? "btn-primary" : "btn-secondary"} w-full text-sm`}
                >
                  {c.cta} →
                </span>
              </Link>
            );
          })}
        </div>
        <p className="mt-4 text-center text-xs text-muted max-w-2xl mx-auto">
          Set up this afternoon · cancel anytime · no commission, ever · standard
          card processing (2.9% + 30¢) applies to student payments · your
          earnings are always yours to cash out.
        </p>

        {/* The juxtaposition — what $15 actually buys you out of */}
        <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto mt-12">
          <div className="card !p-6">
            <p className="font-semibold text-muted mb-3">Teaching without it</p>
            <ul className="space-y-2.5 text-sm text-muted">
              <li className="flex gap-2"><span className="text-danger">✗</span> Booking DMs at 10pm, spreadsheets, no-shows</li>
              <li className="flex gap-2"><span className="text-danger">✗</span> Chasing Venmo requests after every class</li>
              <li className="flex gap-2"><span className="text-danger">✗</span> A flat hourly rate — packed room, same pay</li>
              <li className="flex gap-2"><span className="text-danger">✗</span> The studio owns your schedule and your students</li>
            </ul>
          </div>
          <div className="card !p-6 border-brand bg-brand-tint/40">
            <p className="font-semibold text-brand-dark mb-3">Teaching on Kuleo</p>
            <ul className="space-y-2.5 text-sm text-muted">
              <li className="flex gap-2"><span className="text-brand-dark">✓</span> Booked and paid while you sleep — one link does it all</li>
              <li className="flex gap-2"><span className="text-brand-dark">✓</span> Every student pays you directly. 100% yours.</li>
              <li className="flex gap-2"><span className="text-brand-dark">✓</span> Every extra student is extra income — no ceiling</li>
              <li className="flex gap-2"><span className="text-brand-dark">✓</span> Your page, your prices, your audience — live this afternoon</li>
            </ul>
            <Link
              href="/subscribe/start?plan=kuleo_monthly"
              className="btn-primary w-full text-sm mt-5"
            >
              Get booking today →
            </Link>
          </div>
        </div>

        {/* Everything included + the human option */}
        <div className="card max-w-4xl mx-auto mt-6">
          <p className="font-semibold mb-3">Every plan includes the whole studio:</p>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 text-sm text-muted">
            <Included>Your studio page &amp; booking link</Included>
            <Included>Scheduled classes &amp; recurring events</Included>
            <Included>Secure student payments (Stripe)</Included>
            <Included>Class passes &amp; flexible coaching</Included>
            <Included>Earnings dashboard &amp; easy cash-out</Included>
            <Included>Automatic confirmations + calendar invites</Included>
            <Included>Post-class follow-ups &amp; review collection</Included>
            <Included>Student list with your top fans</Included>
            <Included>Free 1-on-1 onboarding &amp; training</Included>
          </ul>
          <div className="mt-5 rounded-lg bg-brand-tint/50 p-4 text-sm">
            <p className="text-muted">
              <span className="font-medium text-foreground">Rather see it before you decide?</span>{" "}
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
      </section>

      <SiteFooterBar />
      <footer className="border-t border-border bg-surface/50">
        <div className="mx-auto max-w-7xl px-4 py-12">
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
                <li><Link href="/demo" className="hover:text-foreground">See a live dashboard</Link></li>
                <li><Link href="/guide" className="hover:text-foreground">Free guide: The Yoga Teacher Economy</Link></li>
                <li><Link href="/about" className="hover:text-foreground">Our story</Link></li>
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

function Included({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-brand-dark mt-0.5">✓</span>
      {children}
    </li>
  );
}

function DemoStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 text-center ${accent ? "border-brand bg-brand-tint/40" : "border-border"}`}>
      <p className="text-[11px] text-muted">{label}</p>
      <p className={`text-lg font-semibold mt-0.5 [font-family:var(--font-display)] ${accent ? "text-brand-dark" : ""}`}>{value}</p>
    </div>
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
