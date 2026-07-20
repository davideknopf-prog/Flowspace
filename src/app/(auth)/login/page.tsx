import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 justify-center text-brand-dark font-semibold text-lg"
        >
          <span className="text-2xl">🧘</span> Flowspace
        </Link>
        <SignIn
          routing="hash"
          signUpUrl="/signup"
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
          New here?{" "}
          <Link href="/signup" className="text-brand-dark font-medium underline">
            Create your studio
          </Link>
        </p>
      </div>
    </main>
  );
}
