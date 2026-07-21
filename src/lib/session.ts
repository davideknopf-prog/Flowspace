import { auth, currentUser } from "@clerk/nextjs/server";
import {
  getTeacherByClerkUserId,
  getTeacherByEmail,
  setTeacherClerkUserId,
  createTeacher,
} from "./repo";
import type { Teacher } from "./types";

// Real auth via Clerk. Clerk owns the session cookie and login/signup UI;
// this module's only job is mapping a signed-in Clerk user to our Teacher row,
// auto-creating one the first time a given Clerk account reaches the app.
export async function getCurrentTeacher(): Promise<Teacher | null> {
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
