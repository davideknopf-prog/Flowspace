"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/lib/session";
import { createReview, deleteReview, setReviewFlag } from "@/lib/repo";

async function requireTeacher() {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  return teacher;
}

export async function addReviewAction(formData: FormData) {
  const teacher = await requireTeacher();
  const authorName = String(formData.get("authorName") ?? "").trim().slice(0, 80);
  const body = String(formData.get("body") ?? "").trim().slice(0, 1000);
  const rating = Math.max(1, Math.min(5, Number(formData.get("rating") ?? 5) || 5));
  const featured = formData.get("featured") === "on";

  if (!authorName || !body) redirect("/dashboard/reviews?error=missing");

  await createReview(teacher.id, { authorName, rating, body, featured });
  revalidatePath("/dashboard/reviews");
  redirect("/dashboard/reviews?added=1");
}

export async function deleteReviewAction(formData: FormData) {
  const teacher = await requireTeacher();
  const id = String(formData.get("id") ?? "");
  if (id) await deleteReview(teacher.id, id);
  revalidatePath("/dashboard/reviews");
  redirect("/dashboard/reviews");
}

// Toggle featured/published on a review. The current value is passed in so the
// server just flips it (the button label reflects the resulting state).
export async function toggleReviewFlagAction(formData: FormData) {
  const teacher = await requireTeacher();
  const id = String(formData.get("id") ?? "");
  const flag = String(formData.get("flag") ?? "");
  const value = String(formData.get("value") ?? "") === "true";
  if (id && (flag === "featured" || flag === "published")) {
    await setReviewFlag(teacher.id, id, flag, value);
  }
  revalidatePath("/dashboard/reviews");
  redirect("/dashboard/reviews");
}
