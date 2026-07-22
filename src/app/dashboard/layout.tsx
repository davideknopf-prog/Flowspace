import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { getViewerContext } from "@/lib/session";
import { isSubscribed } from "@/lib/types";
import { exitViewAsAction } from "./actions";
import { Avatar } from "@/components/Avatar";
import { DashboardNav } from "@/components/DashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getViewerContext();
  if (!ctx) redirect("/login");
  const { teacher, isFounderViewer, impersonating } = ctx;
  // Pay-at-signup: the dashboard is for subscribed teachers. Public booking
  // pages stay up regardless — a lapsed teacher's students are never blocked.
  // Founder viewers (FOUNDER_EMAILS env var) bypass the gate to demo freely,
  // including while viewing another teacher's dashboard.
  if (!isSubscribed(teacher) && !isFounderViewer) redirect("/subscribe");

  return (
    <div className="min-h-screen flex flex-col">
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
            className="flex items-center gap-2 font-semibold text-lg text-brand-dark [font-family:var(--font-display)]"
          >
            <span className="text-xl">🧘</span> Kuleo
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

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 flex gap-8">
        <DashboardNav />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
