"use server";

import { redirect } from "next/navigation";
import { createTeacher, getTeacherByEmail } from "@/lib/repo";
import { setSession, clearSession } from "@/lib/session";

// Demo login: find-or-create a teacher by email, no password. See session.ts for
// why this is a stub and how it maps onto Clerk later.
export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@")) {
    redirect("/login?error=Enter+a+valid+email");
  }
  const teacher = await getTeacherByEmail(email);
  if (!teacher) {
    redirect("/login?error=No+account+for+that+email.+Try+signing+up.");
  }
  await setSession(teacher!.id);
  redirect("/dashboard");
}

export async function signupAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  if (!email || !email.includes("@")) {
    redirect("/signup?error=Enter+a+valid+email");
  }
  const existing = await getTeacherByEmail(email);
  if (existing) {
    redirect("/signup?error=That+email+already+has+an+account.+Log+in.");
  }
  const teacher = await createTeacher(email, name);
  await setSession(teacher.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}
