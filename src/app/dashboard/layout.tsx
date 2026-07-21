import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { getCurrentTeacher } from "@/lib/session";
import { isSubscribed } from "@/lib/types";
import { isFounder } from "@/lib/founder";
import { Avatar } from "@/components/Avatar";
import { DashboardNav } from "@/components/DashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  // Pay-at-signup: the dashboard is for subscribed teachers. Public booking
  // pages stay up regardless — a lapsed teacher's students are never blocked.
  // Founder emails (FOUNDER_EMAILS env var) bypass the gate to demo freely.
  if (!isSubscribed(teacher) && !isFounder(teacher.email)) redirect("/subscribe");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold text-brand-dark"
          >
            <span className="text-xl">🧘</span> Flowspace
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
