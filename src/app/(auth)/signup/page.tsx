import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 justify-center text-brand-dark font-semibold text-lg"
        >
          <span className="text-2xl">🧘</span> Kuleo
        </Link>
        <SignUp
          routing="hash"
          signInUrl="/login"
          fallbackRedirectUrl="/dashboard"
          appearance={{
            elements: {
              card: "shadow-none border border-[var(--border)] rounded-2xl",
              headerTitle: "text-xl font-semibold",
              formButtonPrimary:
                "bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-sm normal-case",
              footerAction: "hidden",
            },
          }}
        />
        <p className="mt-6 text-center text-sm text-muted">
          Already have a studio?{" "}
          <Link href="/login" className="text-brand-dark font-medium underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
