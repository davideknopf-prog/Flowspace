import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Kuleo",
  description: "How Kuleo collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 22, 2026">
      <p>
        This Privacy Policy explains how Upshift Solutions LLC, operating as
        Kuleo (&quot;Kuleo,&quot; &quot;we,&quot; &quot;us&quot;), collects,
        uses, and shares information when you use kuleo.io (the
        &quot;Platform&quot;).
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li>
          <strong>Account information:</strong> name, email address, and login
          credentials (managed by our authentication provider, Clerk).
        </li>
        <li>
          <strong>Profile information</strong> (Teachers): photo, bio, location,
          specialties, class details, and payout handle (e.g., a Zelle, Venmo,
          or PayPal username — never bank account or card numbers).
        </li>
        <li>
          <strong>Booking information</strong> (Students): name, email, the
          classes you book, and optional notes you share with your teacher.
        </li>
        <li>
          <strong>Payment information:</strong> processed entirely by Stripe.
          Kuleo never sees or stores your card number.
        </li>
        <li>
          <strong>Usage information:</strong> pages visited, actions taken, and
          approximate device/browser information, collected via analytics
          (PostHog) using cookies and similar technologies.
        </li>
      </ul>

      <h2>2. How we use it</h2>
      <p>
        We use this information to operate the Platform (bookings, payments,
        payouts, emails like booking confirmations), improve the product
        (analytics), keep the Platform safe, and communicate with you about
        your account. We do not sell your personal information.
      </p>

      <h2>3. How we share it</h2>
      <p>
        We share information only with service providers who help us run the
        Platform: Stripe (payments), Clerk (authentication), Neon (database),
        Vercel (hosting), PostHog (analytics), and Resend (email). Each
        receives only what it needs. We may also disclose information when
        required by law. If you book with a Teacher, that Teacher sees your
        name, email, and booking details — they need them to teach you.
      </p>

      <h2>4. Cookies &amp; analytics</h2>
      <p>
        We use cookies and similar technologies for sign-in sessions and
        product analytics. Analytics help us understand how the Platform is
        used so we can improve it. You can limit cookies in your browser
        settings; core features like staying signed in require them.
      </p>

      <h2>5. Data retention</h2>
      <p>
        We keep account and booking records while your account is active and as
        needed for legal, tax, and dispute purposes. You can request deletion
        of your account and personal information at any time (see below).
      </p>

      <h2>6. Your rights</h2>
      <p>
        You may request access to, correction of, or deletion of your personal
        information by emailing upshiftsolutionsllc@gmail.com. Depending on
        where you live (for example, under certain US state privacy laws or the
        GDPR), you may have additional rights; we will honor valid requests as
        required by applicable law.
      </p>

      <h2>7. Children</h2>
      <p>
        The Platform is intended for adults. Accounts and purchases require you
        to be at least 18. We do not knowingly collect personal information
        from children under 13; if you believe a child has provided us
        information, contact us and we will delete it.
      </p>

      <h2>8. Security</h2>
      <p>
        We use reputable infrastructure providers, encryption in transit, and
        access controls. No system is perfectly secure; please use a strong,
        unique password.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update this policy as the Platform evolves and will post updates
        here with a new &quot;Last updated&quot; date.
      </p>
    </LegalPage>
  );
}
