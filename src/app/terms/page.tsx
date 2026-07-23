import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — Kuleo",
  description: "The terms that govern use of the Kuleo platform.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="July 22, 2026">
      <p>
        Welcome to Kuleo. These Terms of Service (&quot;Terms&quot;) are an
        agreement between you and Upshift Solutions LLC, operating as Kuleo
        (&quot;Kuleo,&quot; &quot;we,&quot; &quot;us&quot;), and govern your use
        of kuleo.io and related services (the &quot;Platform&quot;). By creating
        an account, subscribing, booking a class, or otherwise using the
        Platform, you agree to these Terms and to our{" "}
        <Link href="/privacy" className="text-brand-dark font-medium">Privacy Policy</Link>{" "}
        and, when booking or attending classes, the{" "}
        <Link href="/waiver" className="text-brand-dark font-medium">Liability Waiver &amp; Assumption of Risk</Link>.
      </p>

      <h2>1. What Kuleo is</h2>
      <p>
        Kuleo is a platform that lets independent yoga teachers
        (&quot;Teachers&quot;) run their own teaching businesses — profiles,
        scheduling, bookings, and payments — and lets students
        (&quot;Students&quot;) discover and book classes with them. Kuleo is a
        venue and toolset. Teachers are independent businesses: they are not
        employees, agents, or representatives of Kuleo, and Kuleo does not
        supervise, direct, or control the classes they teach.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You must provide accurate information when creating an account and keep
        your credentials secure. You are responsible for activity under your
        account. You must be at least 18 years old to create a Teacher account
        or make a purchase.
      </p>

      <h2>3. Teacher terms</h2>
      <ul>
        <li>
          <strong>Subscription.</strong> Teachers pay a recurring subscription
          (weekly, monthly, or annual) to use the Platform. Pricing is shown
          before purchase. Subscriptions renew automatically until canceled and
          can be canceled anytime from the Billing page; cancellation takes
          effect at the end of the paid period.
        </li>
        <li>
          <strong>Your earnings.</strong> A flat 6% processing fee is deducted
          from each class or pass sale before it reaches your balance. This fee
          covers third-party card-processing costs and platform maintenance;
          there is no additional per-class commission. Your balance (your sale
          price less this fee) is always yours to cash out, whether or not your
          subscription is active.
        </li>
        <li>
          <strong>Payouts.</strong> Cash-outs are paid to the payout handle you
          provide (e.g., Zelle, Venmo, or PayPal). You are responsible for
          providing accurate payout details.
        </li>
        <li>
          <strong>Independent contractor.</strong> You are solely responsible
          for your classes, your qualifications and certifications, your
          conduct, applicable insurance, and your taxes. Kuleo does not withhold
          taxes and may issue tax documentation where required by law.
        </li>
        <li>
          <strong>Your content.</strong> You own the content you post (photos,
          bios, class descriptions). You grant Kuleo a license to display it on
          the Platform and in Platform marketing. Don&apos;t post content you
          don&apos;t have rights to.
        </li>
      </ul>

      <h2>4. Student terms</h2>
      <ul>
        <li>
          <strong>Booking &amp; payment.</strong> When you book a class or buy a
          class pass, you pay the Teacher&apos;s listed price via our payment
          processor. Your payment goes to the Teacher (less a flat 6% processing
          fee); Kuleo does not add any extra fees on top for Students.
        </li>
        <li>
          <strong>Cancellations &amp; refunds.</strong> If a Teacher cancels a
          class, you are entitled to a refund of that booking. If you need to
          cancel or reschedule, contact your Teacher — refunds for Student
          cancellations are at the Teacher&apos;s discretion unless required by
          law. Kuleo can assist in disputes at
          upshiftsolutionsllc@gmail.com.
        </li>
        <li>
          <strong>Physical activity.</strong> Yoga is physical exercise. By
          booking or attending a class you agree to the{" "}
          <Link href="/waiver" className="text-brand-dark font-medium">Liability Waiver &amp; Assumption of Risk</Link>.
        </li>
      </ul>

      <h2>5. Acceptable use</h2>
      <p>
        Don&apos;t misuse the Platform: no unlawful activity, harassment,
        impersonation, scraping, interfering with the service, or circumventing
        payments that are due through the Platform. We may suspend or terminate
        accounts that violate these Terms.
      </p>

      <h2>6. Disclaimers</h2>
      <p>
        The Platform is provided &quot;as is&quot; and &quot;as available.&quot;
        Kuleo does not warrant uninterrupted or error-free operation, and does
        not vet, endorse, or guarantee any Teacher, class, or outcome. Nothing
        on the Platform is medical advice; consult a physician before beginning
        any exercise program.
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Kuleo will not be liable for
        indirect, incidental, special, consequential, or punitive damages, or
        for lost profits or data. To the fullest extent permitted by law,
        Kuleo&apos;s total liability for any claim arising out of the Platform
        is limited to the amounts you paid to Kuleo in the twelve months before
        the claim arose.
      </p>

      <h2>8. Indemnification</h2>
      <p>
        You agree to indemnify and hold Kuleo harmless from claims arising out
        of your use of the Platform, your content, your classes (for Teachers),
        or your violation of these Terms.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update these Terms as the Platform evolves. We&apos;ll post the
        updated version here with a new &quot;Last updated&quot; date, and
        material changes will be communicated reasonably. Continued use after
        changes means you accept them.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These Terms are governed by the laws of the Commonwealth of
        Massachusetts, without regard to conflict-of-law rules. Disputes will be
        resolved in the state or federal courts located in Massachusetts.
      </p>
    </LegalPage>
  );
}
