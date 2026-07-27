import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooterBar } from "@/components/SiteFooterBar";
import { getCurrentTeacher } from "@/lib/session";
import { PRICING } from "@/lib/billing";
import { getStudioSchedule, type StudioEntry } from "@/lib/studio";
import { pickDemoTeacher, getDemoSnapshot, type DemoSnapshot } from "@/lib/demo";
import { Avatar } from "@/components/Avatar";
import { formatPrice, formatDuration, formatMoney } from "@/lib/format";

const CALENDLY_URL = "https://calendly.com/david-knopf/onboarding-meeting";
const PHONE_DISPLAY = "(508) 468-7829";
const PHONE_HREF = "tel:+15084687829";

export default async function Home() {
  const teacher = await getCurrentTeacher();

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
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 pt-16 pb-12 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          {/* The argument — left column, set editorially */}
          <div className="animate-fade-up">
            <p className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.22em] text-muted">
              <span className="h-px w-8 bg-accent" aria-hidden />
              For the independent yoga teacher
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.03] tracking-tight sm:text-5xl lg:text-[3.6rem]">
              Fill your classes.<br />
              <em className="text-brand-dark mr-[0.14em]">Get paid</em> what
              you&apos;re worth.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
              More students, more income, and the freedom to just teach. Kuleo
              runs your bookings, payments, and follow-ups from one link — you
              focus on the mat.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href={teacher ? "/dashboard" : "/signup"} className="btn-primary">
                {teacher ? "Go to your studio" : "Start your studio"}
              </Link>
              <Link
                href="/demo"
                className="text-sm font-medium text-brand-dark underline decoration-1 underline-offset-4"
              >
                See a real teacher&apos;s dashboard →
              </Link>
            </div>

            {/* Founder voice — the human behind the tool */}
            <figure className="mt-10 max-w-md border-l-2 border-accent/50 pl-4">
              <blockquote className="text-[15px] leading-relaxed text-foreground/80">
                I built Kuleo so independent teachers keep what they earn and run
                the whole thing from one link. Questions before you start? Text
                me — or book a quick call.
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/founder-david.jpg"
                  alt="David, founder of Kuleo"
                  className="size-12 shrink-0 rounded-full object-cover ring-2 ring-accent/30"
                />
                <span className="text-sm text-muted">
                  <span className="text-base italic text-foreground [font-family:var(--font-display)]">
                    David
                  </span>
                  , founder
                  <br />
                  <a href={PHONE_HREF} className="font-medium text-brand-dark">
                    {PHONE_DISPLAY}
                  </a>{" "}
                  ·{" "}
                  <a
                    href={CALENDLY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand-dark underline underline-offset-2"
                  >
                    book a call
                  </a>
                </span>
              </figcaption>
            </figure>

            <p className="mt-6 text-sm text-muted">
              Here to take a class instead?{" "}
              <Link
                href="/students"
                className="font-medium text-brand-dark underline underline-offset-2"
              >
                Browse teachers →
              </Link>
            </p>
          </div>

          {/* The real product, not a promise — right column */}
          <div className="animate-fade-up-late relative mx-auto w-full max-w-sm lg:mx-0 lg:ml-auto">
            <div className="rounded-xl border border-border bg-surface p-6 shadow-[0_2px_24px_-10px_rgba(38,33,28,0.16)]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted">
                  Your studio
                </span>
                <span className="text-xs font-medium text-brand-dark">This week</span>
              </div>
              <div className="mt-5">
                <p className="text-sm text-muted">You taught</p>
                <p className="mt-1">
                  <span
                    className="text-5xl font-semibold text-brand-dark [font-family:var(--font-display)]"
                    style={{
                      background:
                        "linear-gradient(180deg, transparent 58%, #f6e59a 58%, #f6e59a 94%, transparent 94%)",
                      padding: "0 6px",
                      boxDecorationBreak: "clone",
                      WebkitBoxDecorationBreak: "clone",
                    }}
                  >
                    47 students
                  </span>
                </p>
                <p className="mt-3 text-sm text-muted">
                  <span className="font-medium text-foreground">$1,240 earned</span>{" "}
                  · 31 came back for more.
                </p>
              </div>
              <div className="mt-5 space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Sunrise Flow</span>
                  <span className="text-muted">Tomorrow · 7:00 AM · 8 booked</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Restorative Evening</span>
                  <span className="text-muted">Thu · 6:30 PM · 11 booked</span>
                </div>
              </div>
            </div>
            {/* a small human moment, floating over the surface */}
            <div className="absolute -bottom-5 -left-4 hidden rounded-lg border border-border bg-surface px-4 py-3 shadow-[0_2px_18px_-6px_rgba(38,33,28,0.2)] sm:block">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
                New pass sold
              </p>
              <p className="text-sm font-medium">Priya · 5-Class Pass · $80</p>
            </div>
          </div>
        </div>

        {/* A slim, honest trust strip — real numbers, quietly stated */}
        <div className="mx-auto max-w-7xl px-4 pb-14">
          {teacherCount > 0 && (
            <p className="text-sm text-muted">
              <span className="font-semibold text-foreground">{teacherCount}</span>{" "}
              verified teacher{teacherCount === 1 ? "" : "s"} ·{" "}
              <span className="font-semibold text-foreground">{weekClassCount}</span>{" "}
              bookable class{weekClassCount === 1 ? "" : "es"} this week ·{" "}
              <span className="font-semibold text-foreground">100%</span> of class
              earnings go to teachers
            </p>
          )}
          <p className="mt-4 max-w-xl text-base italic text-muted [font-family:var(--font-display)]">
            Our mission is simple: make yoga available to everyone —{" "}
            <span className="text-brand-dark">by making it pay to teach.</span>
          </p>
        </div>
      </section>

      {/* The pain, named — and the reframe. The emotional core. */}
      <section className="border-b border-border bg-brand-tint/40">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-20">
          <p className="inline-flex items-center gap-3 text-xs font-medium uppercase tracking-[0.22em] text-muted">
            <span className="h-px w-8 bg-accent" aria-hidden />
            The honest truth
            <span className="h-px w-8 bg-accent" aria-hidden />
          </p>
          <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            The problem was never your teaching.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            Empty classes. Chasing Venmo after every session. A day job you
            don&apos;t love, because teaching doesn&apos;t pay the way it should.
            You&apos;re a better teacher than your paycheck says — the business
            around you was just built to take the cut.
          </p>
          <p className="mt-5 text-lg font-medium text-foreground">
            Kuleo hands it back. Three things change:
          </p>
          <div className="mt-10 grid gap-8 border-t border-border pt-10 text-left sm:grid-cols-3">
            <div>
              <p className="text-xl font-semibold [font-family:var(--font-display)]">
                Connect with more students
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                One booking link fills the room, and automatic follow-ups bring
                them back — so your classes stop being empty.
              </p>
            </div>
            <div>
              <p className="text-xl font-semibold [font-family:var(--font-display)]">
                Earn what you&apos;re worth
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Every student pays you directly. More students means more
                income — no flat rate, no ceiling, no middleman.
              </p>
            </div>
            <div>
              <p className="text-xl font-semibold [font-family:var(--font-display)]">
                Become a better teacher
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Spend your energy on the mat, not the admin. Watch students
                return week after week — the truest proof you&apos;re great.
              </p>
            </div>
          </div>
          <div className="mt-10">
            <Link href={teacher ? "/dashboard" : "/signup"} className="btn-primary">
              {teacher ? "Go to your studio" : "Start your studio"}
            </Link>
          </div>
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

      {/* Features — an editorial index, not a card grid */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
        <div className="mb-10 max-w-xl">
          <p className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.22em] text-muted">
            <span className="h-px w-8 bg-accent" aria-hidden />
            What Kuleo runs for you
          </p>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            Less admin. More teaching.
          </h2>
          <p className="mt-3 leading-relaxed text-muted">
            You didn&apos;t train for years to chase payments and answer booking
            DMs. Kuleo quietly runs the parts of your business that pull you off
            the mat.
          </p>
        </div>
        <div className="border-t border-border">
          <IndexRow
            n="01"
            title="Turn followers into students"
            body="Your classes, story, and prices live on one link built for your Instagram bio. Visitors see your next open times the moment they land — and book on the spot."
          />
          <IndexRow
            n="02"
            title="Scheduling that runs itself"
            body="Set your weekly hours once. Kuleo turns them into bookable times for online or in-person sessions — no DMs, no double-bookings, no back-and-forth."
          />
          <IndexRow
            n="03"
            title="Payments, passes & payouts"
            body="Students pay the moment they book, with class passes built in for repeat practice. From $11.05/month and a flat 6% per sale — no surprise commissions, ever."
          />
          <IndexRow
            n="04"
            title="Follow-ups that bring them back"
            body="After class, Kuleo sends the thank-you, gathers the review, and nudges the rebooking — the quiet retention work that otherwise never gets done."
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
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="inline-flex items-center gap-3 text-xs font-medium uppercase tracking-[0.22em] text-muted">
            <span className="h-px w-8 bg-accent" aria-hidden />
            Simple, honest pricing
            <span className="h-px w-8 bg-accent" aria-hidden />
          </p>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            Start free. Go live when you&apos;re ready.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
            Build your whole studio for free. Upgrade to publish, take bookings,
            and get paid — students always pay you directly.
          </p>
        </div>

        {/* Three tiers: Free to build, then monthly or annual to go live. */}
        <div className="mx-auto grid max-w-5xl items-stretch gap-4 sm:grid-cols-3">
          {/* Free — build */}
          <Link
            href={teacher ? "/dashboard" : "/signup"}
            className="card card-lift !p-6 flex flex-col text-center"
          >
            <p className="font-semibold text-muted">Free</p>
            <p className="mt-3 text-4xl font-semibold text-foreground [font-family:var(--font-display)]">
              $0
            </p>
            <p className="mt-2 flex-1 text-sm text-muted">
              Build &amp; customize your whole studio and preview it. Upgrade any
              time to go live and take bookings.
            </p>
            <span className="btn-secondary mt-5 w-full text-sm">Start free →</span>
          </Link>

          {/* Monthly — go live */}
          <Link
            href={`/subscribe/start?plan=${PRICING.monthly.lookupKey}`}
            className="card card-lift !p-6 flex flex-col text-center"
          >
            <p className="font-semibold text-muted">Monthly</p>
            <p className="mt-3 text-4xl font-semibold text-foreground [font-family:var(--font-display)]">
              {PRICING.monthly.perMonth}
              <span className="text-base font-normal text-muted [font-family:var(--font-sans)]">
                /mo
              </span>
            </p>
            <p className="mt-2 flex-1 text-sm text-muted">
              Go live and take bookings. Includes a 14-day free trial · cancel
              anytime.
            </p>
            <span className="btn-secondary mt-5 w-full text-sm">Go live →</span>
          </Link>

          {/* Annual — best value */}
          <Link
            href={`/subscribe/start?plan=${PRICING.annual.lookupKey}`}
            className="card card-lift !p-6 relative flex flex-col text-center border-brand ring-2 ring-[var(--ring)]"
          >
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3 py-0.5 text-[11px] font-semibold text-white">
              BEST VALUE · {PRICING.annual.save}
            </span>
            <p className="font-semibold text-muted">Annual</p>
            <p className="mt-3 text-4xl font-semibold text-brand-dark [font-family:var(--font-display)]">
              {PRICING.annual.perMonth}
              <span className="text-base font-normal text-muted [font-family:var(--font-sans)]">
                /mo
              </span>
            </p>
            <p className="mt-2 flex-1 text-sm text-muted">
              {PRICING.annual.sub}. Includes a 14-day free trial.
            </p>
            <span className="btn-primary mt-5 w-full text-sm">Go live →</span>
          </Link>
        </div>
        <p className="mx-auto mt-4 max-w-2xl text-center text-xs text-muted">
          Free to build · a flat 6% per sale once you&apos;re live · cancel
          anytime · your earnings are always yours to cash out.
        </p>

        {/* Free onboarding + training + IG feature — a real value-add */}
        <div className="mx-auto mt-6 max-w-3xl rounded-xl border border-brand bg-brand-tint/50 p-5 text-center">
          <p className="text-sm leading-relaxed">
            <span className="font-semibold text-brand-dark">
              Every plan includes free 1-on-1 onboarding &amp; training
            </span>{" "}
            — and we feature you to our audience with branded Instagram posts,
            sharing your studio across our network.
          </p>
        </div>

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

      {/* Final CTA — big, clear, one action */}
      <section className="bg-brand-dark">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-20">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl [font-family:var(--font-display)]">
            Ready to fill your classes?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-white/75">
            Set up your studio in minutes and take your first booking this week.
          </p>
          <div className="mt-8">
            <Link
              href={teacher ? "/dashboard" : "/signup"}
              className="inline-flex rounded-lg bg-white px-8 py-4 text-base font-semibold text-brand-dark transition-colors hover:bg-white/90"
            >
              {teacher ? "Go to your studio" : "Start your studio →"}
            </Link>
          </div>
          <p className="mt-4 text-sm text-white/60">
            Build free · go live with a 14-day free trial · cancel anytime
          </p>
        </div>
      </section>

      <SiteFooterBar />
      <footer className="border-t border-border bg-surface/50">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 text-sm">
            <div>
              <p className="flex items-baseline text-xl font-semibold tracking-tight text-brand-dark mb-3 [font-family:var(--font-display)]">
                Kuleo<span className="text-accent">.</span>
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

function IndexRow({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="grid gap-x-8 gap-y-2 border-b border-border py-8 sm:grid-cols-[4rem_1fr]">
      <span className="text-2xl font-semibold text-accent [font-family:var(--font-display)]">
        {n}
      </span>
      <div className="max-w-2xl">
        <h3 className="text-xl font-semibold [font-family:var(--font-display)]">{title}</h3>
        <p className="mt-2 leading-relaxed text-muted">{body}</p>
      </div>
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
