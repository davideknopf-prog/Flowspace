import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import {
  getTeacherByClerkUserId,
  getTeacherByEmail,
  getTeacherById,
  setTeacherClerkUserId,
  createTeacher,
} from "./repo";
import { isFounder } from "./founder";
import type { Teacher } from "./types";

const VIEW_AS_COOKIE = "kuleo_view_as";

export interface ViewerContext {
  // The teacher whose data the dashboard should show (may be impersonated).
  teacher: Teacher;
  // The real signed-in teacher behind the session.
  realTeacher: Teacher;
  // True when the real viewer is a founder (subscription gate bypass, view-as).
  isFounderViewer: boolean;
  // True when founder is currently viewing another teacher's dashboard.
  impersonating: boolean;
}

// Resolve the real signed-in teacher from Clerk, creating/relinking the row
// as needed. Returns null when not signed in.
async function resolveRealTeacher(): Promise<Teacher | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await getTeacherByClerkUserId(userId);
  if (existing) return existing;

  const user = await currentUser();
  if (!user) return null;
  const email = user.emailAddresses[0]?.emailAddress ?? "";
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    email.split("@")[0] ||
    "Teacher";

  // A teacher row may already exist for this (Clerk-verified) email but be
  // linked to a different Clerk user id — e.g. after the dev -> production
  // Clerk instance migration, or a user deleting and recreating their Clerk
  // account. Relink instead of colliding with the unique email constraint.
  if (email) {
    const byEmail = await getTeacherByEmail(email);
    if (byEmail) {
      await setTeacherClerkUserId(byEmail.id, userId);
      return { ...byEmail, clerkUserId: userId };
    }
  }

  // Next.js can invoke this from more than one place (middleware + layout)
  // for the same request burst, so two calls can race to create the same
  // brand-new user's row. If our insert fails, re-check by clerk_user_id
  // first (the other call may have just won) before giving up.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await createTeacher(email, name, userId);
    } catch {
      const wonByOther = await getTeacherByClerkUserId(userId);
      if (wonByOther) return wonByOther;
    }
  }
  return null;
}

// Full viewer context: who's really signed in, and whose dashboard to show.
// Founders can "view as" any teacher via a cookie set by viewAsAction —
// every dashboard page then transparently renders that teacher's data.
export async function getViewerContext(): Promise<ViewerContext | null> {
  const realTeacher = await resolveRealTeacher();
  if (!realTeacher) return null;

  const founderViewer = isFounder(realTeacher.email);
  let teacher = realTeacher;
  let impersonating = false;

  if (founderViewer) {
    const viewAs = (await cookies()).get(VIEW_AS_COOKIE)?.value;
    if (viewAs && viewAs !== realTeacher.id) {
      const target = await getTeacherById(viewAs);
      if (target) {
        teacher = target;
        impersonating = true;
      }
    }
  }

  return { teacher, realTeacher, isFounderViewer: founderViewer, impersonating };
}

// The teacher whose data the current dashboard request should display.
// (Impersonation-aware — this is what every dashboard page already calls.)
export async function getCurrentTeacher(): Promise<Teacher | null> {
  const ctx = await getViewerContext();
  return ctx?.teacher ?? null;
}

export async function setViewAsCookie(teacherId: string): Promise<void> {
  (await cookies()).set(VIEW_AS_COOKIE, teacherId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4, // 4h is plenty for a demo session
  });
}

export async function clearViewAsCookie(): Promise<void> {
  (await cookies()).delete(VIEW_AS_COOKIE);
}
