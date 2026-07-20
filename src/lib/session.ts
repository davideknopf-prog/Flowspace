import { cookies } from "next/headers";
import { getTeacherById } from "./repo";
import type { Teacher } from "./types";

// -----------------------------------------------------------------------------
// Stubbed auth.
//
// A signed-in teacher is represented by a single cookie holding their id. There
// is NO password check — this is a demo login so you can show the product to
// your first teachers today. When you're ready for real auth, swap this module
// for Clerk: `getCurrentTeacher()` becomes "read Clerk user -> map to Teacher",
// and login/logout move to Clerk's hosted UI. Nothing else in the app calls
// cookies() directly.
// -----------------------------------------------------------------------------

const COOKIE = "yoga_teacher_id";

export async function setSession(teacherId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, teacherId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getCurrentTeacher(): Promise<Teacher | null> {
  const store = await cookies();
  const id = store.get(COOKIE)?.value;
  if (!id) return null;
  return getTeacherById(id);
}
