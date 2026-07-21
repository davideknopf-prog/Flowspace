// Founder contact shown to new teachers, and the founder allowlist that
// bypasses the subscription gate (so the founder can demo the dashboard
// without paying their own platform).

export const FOUNDER = {
  name: "David",
  title: "CEO",
  phone: "508.468.7829",
  phoneHref: "tel:+15084687829",
  smsHref: "sms:+15084687829",
  email: "upshiftsolutionsllc@gmail.com",
  onboardingCallUrl: "https://calendly.com/david-knopf/onboarding-meeting",
};

export function isFounder(email: string): boolean {
  return (process.env.FOUNDER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}
