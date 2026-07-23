import Link from "next/link";
import type { Metadata } from "next";
import { LegalFooter } from "@/components/LegalFooter";

const PDF_URL = "/guides/kuleo-yoga-teacher-economy.pdf";
const CALENDLY_URL = "https://calendly.com/david-knopf/onboarding-meeting";

export const metadata: Metadata = {
  title: "The Yoga Teacher Economy — a free guide for yoga teachers | Kuleo",
  description:
    "How much do yoga teachers really make? The real numbers behind studio teaching — average pay per class, why earnings are capped — and the honest math of running your own yoga business: same classes, five times the income, no studio commission.",
};

// The guide lives here as real, indexable HTML (search engines and LLMs read
// prose, not PDFs) with the designed PDF as the download.
export default function GuidePage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-lg text-brand-dark [font-family:var(--font-display)]"
          >
            <span className="text-xl">🧘</span> Kuleo
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/#pricing" className="btn-ghost text-sm hidden sm:inline-flex">
              Pricing
            </Link>
            <Link href="/signup" className="btn-primary text-sm">
              Start your studio
            </Link>
          </nav>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-4 py-12">
        <span className="pill-accent mb-4">Free guide for yoga teachers</span>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight mb-3">
          The Yoga Teacher Economy
        </h1>
        <p className="text-lg text-muted mb-6">
          Why the people who create all the value earn the least — the real
          numbers behind studio teaching, and the honest math of running your
          own practice instead.
        </p>
        <div className="flex flex-wrap items-center gap-3 mb-10">
          <a href={PDF_URL} download className="btn-primary">
            ⬇ Download the PDF — free
          </a>
          <span className="text-xs text-muted">
            No email required. Share it with a teacher who deserves better.
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          <div className="card !p-4 text-center">
            <p className="text-xl font-semibold text-brand-dark">$31/hr</p>
            <p className="text-xs text-muted mt-1">average U.S. group-class teaching rate</p>
          </div>
          <div className="card !p-4 text-center">
            <p className="text-xl font-semibold text-brand-dark">$30–75</p>
            <p className="text-xs text-muted mt-1">typical pay for a class you fill yourself</p>
          </div>
          <div className="card !p-4 text-center">
            <p className="text-xl font-semibold text-brand-dark">67%</p>
            <p className="text-xs text-muted mt-1">of teachers teach fewer than 10 hours a week</p>
          </div>
          <div className="card !p-4 text-center">
            <p className="text-xl font-semibold text-brand-dark">45%</p>
            <p className="text-xs text-muted mt-1">say teaching income covers their cost of living</p>
          </div>
        </div>

        <section className="space-y-4 mb-10">
          <h2 className="heading-flourish text-2xl font-semibold">
            The studio model, honestly
          </h2>
          <p className="text-muted leading-relaxed">
            Walk into any studio class and count the room: 15 students at $25
            is $375 of revenue in a single hour. The teacher who trained for
            years, planned the sequence, built the following, and led every
            breath of it typically takes home a flat $30–75 of that. The studio
            keeps the rest — that&apos;s the model. It isn&apos;t malicious;
            rent and front desks are real. But it produces three hard truths
            for teachers.
          </p>
          <p className="text-muted leading-relaxed">
            <strong className="text-foreground">Your earnings are capped.</strong>{" "}
            A flat rate means a packed room pays you the same as an empty one.
            The upside of your own popularity belongs to the building.
          </p>
          <p className="text-muted leading-relaxed">
            <strong className="text-foreground">
              You are the brand, but not the beneficiary.
            </strong>{" "}
            Students come back for <em>you</em>. They follow <em>you</em>. Yet
            the relationship — the schedule, the payment, even the contact list
            — is owned by the studio.
          </p>
          <p className="text-muted leading-relaxed">
            <strong className="text-foreground">Full-time is barely livable.</strong>{" "}
            Even at a heroic 20 classes a week, flat-rate teaching lands around
            $30,000–45,000 a year before taxes — which is why most teaching
            stays a side job, and why so many gifted teachers quit.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="heading-flourish text-2xl font-semibold mb-4">
            The same two classes, two different economies
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="card !p-5">
              <p className="text-sm font-semibold text-muted mb-1">Teaching for a studio</p>
              <p className="text-2xl font-semibold">$100<span className="text-sm font-normal text-muted">/week</span></p>
              <p className="text-sm text-muted mt-2">
                2 group classes at a $50 flat rate. Your ceiling is your hourly
                rate — forever.
              </p>
            </div>
            <div className="card !p-5 border-brand ring-1 ring-[var(--ring)]">
              <p className="text-sm font-semibold text-brand-dark mb-1">Teaching for yourself</p>
              <p className="text-2xl font-semibold text-brand-dark">$500<span className="text-sm font-normal text-muted">/week</span></p>
              <p className="text-sm text-muted mt-2">
                The same 2 classes, 10 students each at $25 — every student
                pays you. No ceiling: your audience grows, your income grows.
              </p>
            </div>
          </div>
          <p className="text-sm text-muted mt-3">
            Five times the income for the same hours on the mat — not by
            charging more, but by being paid the way the room actually pays.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="heading-flourish text-2xl font-semibold mb-4">
            What a first year can look like
          </h2>
          <p className="text-muted leading-relaxed mb-4">
            An illustration of steady, unglamorous growth — two online classes
            a week to start, priced modestly, audience compounding through
            class passes and word of mouth. You set your own prices and pace;
            this is arithmetic, not a promise.
          </p>
          <div className="card !p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand text-white text-left">
                  <th className="px-4 py-2.5 font-semibold">Phase</th>
                  <th className="px-3 py-2.5 font-semibold">Classes/wk</th>
                  <th className="px-3 py-2.5 font-semibold">Avg students</th>
                  <th className="px-3 py-2.5 font-semibold">Price</th>
                  <th className="px-3 py-2.5 font-semibold">Weekly</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="px-4 py-2.5">Months 1–3 · first students</td><td className="px-3 py-2.5">2</td><td className="px-3 py-2.5">5</td><td className="px-3 py-2.5">$20</td><td className="px-3 py-2.5 font-semibold">$200</td></tr>
                <tr><td className="px-4 py-2.5">Months 4–6 · regulars form</td><td className="px-3 py-2.5">3</td><td className="px-3 py-2.5">7</td><td className="px-3 py-2.5">$22</td><td className="px-3 py-2.5 font-semibold">$462</td></tr>
                <tr><td className="px-4 py-2.5">Months 7–9 · passes kick in</td><td className="px-3 py-2.5">4</td><td className="px-3 py-2.5">8</td><td className="px-3 py-2.5">$25</td><td className="px-3 py-2.5 font-semibold">$800</td></tr>
                <tr><td className="px-4 py-2.5">Months 10–12 · full rooms</td><td className="px-3 py-2.5">4</td><td className="px-3 py-2.5">10</td><td className="px-3 py-2.5">$25</td><td className="px-3 py-2.5 font-semibold">$1,000</td></tr>
                <tr className="bg-brand-tint/60"><td className="px-4 py-2.5 font-semibold" colSpan={4}>Year one, ~4 hrs/week of teaching</td><td className="px-3 py-2.5 font-semibold">≈ $32,000</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted mt-3">
            The same effort at a $31/hour flat rate is roughly{" "}
            <strong className="text-foreground">$6,400 a year</strong>. The
            difference isn&apos;t working harder — it&apos;s owning the room.
            And unlike a studio schedule, this scales past geography: your room
            is anyone, anywhere, with your link.
          </p>
        </section>

        <section className="space-y-4 mb-10">
          <h2 className="heading-flourish text-2xl font-semibold">
            What it takes (less than you think)
          </h2>
          <p className="text-muted leading-relaxed">
            The traditional blocker was never demand — it was operations: a
            booking system, payments, scheduling, reminders, passes, a
            professional page. That&apos;s the part Kuleo runs. One link holds
            your studio: students book real class times, pay you directly, get
            confirmations and calendar invites automatically, and receive a
            follow-up after class that grows your reviews and rebookings while
            you sleep.{" "}
            <strong className="text-foreground">
              Kuleo takes zero commission on your classes
            </strong>{" "}
            — you pay a flat subscription ($7.50/week, $15/month, or $90/year)
            and keep everything you earn, minus only standard card processing
            (2.9% + 30¢). Free 1-on-1 onboarding with the founder is included
            with every plan.
          </p>
          <p className="text-muted leading-relaxed">
            When teachers earn properly, everyone wins: classes get more
            accessible (you can price a $12 community flow and still out-earn a
            studio rate), students get direct relationships with the person
            actually guiding them, and great teachers stay teachers. The
            teacher is the heart of yoga. The economics should finally agree.
          </p>
        </section>

        <div className="card !p-6 bg-brand-tint/50 border-brand text-center">
          <p className="font-semibold text-lg mb-1">
            Start your studio — set up in an afternoon, booked this week.
          </p>
          <p className="text-sm text-muted mb-4">
            Or talk it through first: free demo with David, Kuleo&apos;s
            founder, or call/text{" "}
            <a href="tel:+15084687829" className="text-brand-dark font-medium">
              (508) 468-7829
            </a>
            .
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary">
              Kick off your studio
            </Link>
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Book a free demo
            </a>
            <a href={PDF_URL} download className="btn-secondary">
              ⬇ Download the PDF
            </a>
          </div>
        </div>

        <p className="mt-8 text-xs text-muted leading-relaxed">
          Sources &amp; honesty: compensation figures from published 2026 U.S.
          yoga-teacher pay surveys (PayScale; brettlarkin.com teacher income
          guide). All Kuleo earnings figures are illustrative scenarios —
          teachers set their own prices, class sizes vary, and results depend
          on your audience and effort.
        </p>
      </article>

      <LegalFooter />
    </main>
  );
}
