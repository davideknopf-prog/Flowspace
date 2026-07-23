import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooterBar } from "@/components/SiteFooterBar";
import { LegalFooter } from "@/components/LegalFooter";

export const metadata: Metadata = {
  title: "Why we built Kuleo — our story",
  description:
    "Teachers are the heart of yoga. They should be paid like it. The story behind Kuleo — the operating system for independent yoga teachers.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <article className="mx-auto max-w-2xl px-4 py-12">
        <span className="pill-accent mb-4">Why we built Kuleo</span>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight mb-6">
          Teachers are the heart of yoga. They should be paid like it.
        </h1>
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
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/signup" className="btn-primary">
            Kick off your studio
          </Link>
          <Link href="/demo" className="btn-secondary">
            See a live teacher dashboard
          </Link>
        </div>
      </article>
      <SiteFooterBar />
      <LegalFooter />
    </main>
  );
}
