import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Liability Waiver & Assumption of Risk — Kuleo",
  description:
    "The waiver and assumption of risk that applies to classes booked through Kuleo.",
};

export default function WaiverPage() {
  return (
    <LegalPage
      title="Liability Waiver & Assumption of Risk"
      updated="July 22, 2026"
    >
      <p>
        This Waiver &amp; Assumption of Risk (&quot;Waiver&quot;) applies to
        every class, session, or event booked or attended through Kuleo,
        whether online or in person. By booking or attending a class, you
        (&quot;Participant&quot;) agree to this Waiver.
      </p>

      <h2>1. Yoga is physical activity</h2>
      <p>
        Yoga and related movement practices involve physical exertion,
        stretching, balancing, and changes in position that carry inherent
        risks — including muscle strains, sprains, falls, and in rare cases
        more serious injury. You voluntarily choose to participate with full
        knowledge of these risks, and you assume all risks of participation,
        whether known or unknown.
      </p>

      <h2>2. Your health is your responsibility</h2>
      <p>
        You confirm that you are physically able to participate, and that you
        have consulted (or had the opportunity to consult) a physician about
        your fitness to participate — especially if you are pregnant, have a
        medical condition, or are recovering from injury. You agree to work
        within your own limits, to modify or skip anything that feels wrong,
        and to stop and seek medical attention if you experience pain,
        dizziness, or distress. Nothing provided by Kuleo or any Teacher is
        medical advice.
      </p>

      <h2>3. Your environment (online classes)</h2>
      <p>
        For online classes, you are responsible for your own practice space.
        Ensure adequate clear space, a non-slip surface, and freedom from
        hazards before class begins.
      </p>

      <h2>4. Teachers are independent</h2>
      <p>
        Teachers on Kuleo are independent providers, not employees or agents of
        Kuleo. Each Teacher is responsible for the classes they teach. Kuleo
        provides the platform through which classes are booked and does not
        supervise or control instruction.
      </p>

      <h2>5. Release of liability</h2>
      <p>
        To the fullest extent permitted by law, you release and hold harmless
        Upshift Solutions LLC (operating as Kuleo), its owners, and personnel
        from any claims, demands, or causes of action arising out of or
        relating to your participation in any class booked through the
        Platform, including claims based on ordinary negligence. This release
        does not apply to liability that cannot be waived under applicable
        law, including liability for gross negligence or willful misconduct.
      </p>

      <h2>6. Emergency care</h2>
      <p>
        In an in-person setting, if you are unable to communicate, you consent
        to reasonable emergency measures being taken on your behalf, at your
        expense.
      </p>

      <h2>7. Acknowledgment</h2>
      <p>
        By booking or attending a class through Kuleo, you acknowledge that you
        have read this Waiver, understand it, and agree to be bound by it. If
        you do not agree, do not book or attend classes through the Platform.
      </p>
    </LegalPage>
  );
}
