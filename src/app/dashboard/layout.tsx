import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { getViewerContext } from "@/lib/session";
import { isSubscribed } from "@/lib/types";
import { exitViewAsAction } from "./actions";
import { Avatar } from "@/components/Avatar";
import { DashboardNav, DashboardNavMobile } from "@/components/DashboardNav";
import { ChatIdentify } from "@/components/LiveChat";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getViewerContext();
  if (!ctx) redirect("/login");
  const { teacher, isFounderViewer, impersonating } = ctx;
  // Free draft tier: every teacher can build and customize their studio for
  // free. Going *live* (a public, bookable page) requires a subscription/trial.
  // So we no longer gate the dashboard itself — instead we show a draft banner
  // and gate the public page + bookings elsewhere. Founders bypass all of it.
  const isDraft = !isSubscribed(teacher) && !isFounderViewer;

  return (
    <div className="min-h-screen flex flex-col">
      <ChatIdentify email={teacher.email} name={teacher.name} />
      {isDraft && (
        <div className="bg-brand-dark text-white text-sm px-4 py-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
          <span>
            ✨ <span className="font-semibold">Draft mode</span> — build your
            studio free. Go live to open bookings and get paid.
          </span>
          <Link
            href="/subscribe"
            className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-brand-dark shrink-0"
          >
            Go live — start free →
          </Link>
        </div>
      )}
      {impersonating && (
        <div className="bg-accent text-white text-sm px-4 py-2 flex items-center justify-center gap-3">
          <span>
            👁 Viewing as <span className="font-semibold">{teacher.name}</span> —
            this is their dashboard exactly as they see it.
          </span>
          <form action={exitViewAsAction}>
            <button
              type="submit"
              className="underline font-medium cursor-pointer"
            >
              Exit
            </button>
          </form>
        </div>
      )}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-baseline text-xl font-semibold tracking-tight text-brand-dark [font-family:var(--font-display)]"
          >
            Kuleo<span className="text-accent">.</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href={`/t/${teacher.slug}`}
              target="_blank"
              className="btn-secondary hidden sm:inline-flex text-xs"
            >
              View public page ↗
            </Link>
            <div className="flex items-center gap-2">
              <Avatar name={teacher.name} src={teacher.avatarUrl} size={32} />
              <span className="text-sm text-muted hidden sm:inline">
                {teacher.name}
              </span>
            </div>
            <SignOutButton redirectUrl="/">
              <button className="btn-ghost text-xs" type="button">
                Log out
              </button>
            </SignOutButton>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 pt-4 md:hidden">
        <DashboardNavMobile />
      </div>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 flex gap-8">
        <DashboardNav />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
