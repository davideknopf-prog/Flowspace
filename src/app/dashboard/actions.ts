"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/lib/session";
import {
  updateTeacher,
  getTeacherBySlug,
  createSessionType,
  deleteSessionType,
  setAvailability,
} from "@/lib/repo";
import { slugify } from "@/lib/db";

async function requireTeacher() {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  return teacher;
}

export async function saveProfileAction(formData: FormData) {
  const teacher = await requireTeacher();

  const desiredSlug = slugify(String(formData.get("slug") ?? teacher.slug));
  // Keep the current slug if the new one collides with another teacher.
  let slug = desiredSlug || teacher.slug;
  if (slug !== teacher.slug) {
    const clash = await getTeacherBySlug(slug);
    if (clash && clash.id !== teacher.id) slug = teacher.slug;
  }

  const specialties = String(formData.get("specialties") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);

  await updateTeacher(teacher.id, {
    name: String(formData.get("name") ?? "").trim() || teacher.name,
    slug,
    headline: String(formData.get("headline") ?? "").trim(),
    bio: String(formData.get("bio") ?? "").trim(),
    location: String(formData.get("location") ?? "").trim(),
    avatarUrl: String(formData.get("avatarUrl") ?? "").trim(),
    timezone: String(formData.get("timezone") ?? "").trim() || teacher.timezone,
    specialties,
  });

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  redirect("/dashboard/profile?saved=1");
}

export async function addSessionTypeAction(formData: FormData) {
  const teacher = await requireTeacher();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/dashboard/schedule?error=Name+is+required");

  const durationMinutes = Math.max(
    5,
    Math.min(480, Number(formData.get("durationMinutes") ?? 60) || 60),
  );
  const dollars = Math.max(0, Number(formData.get("price") ?? 0) || 0);
  const priceCents = Math.round(dollars * 100);

  const locationType =
    String(formData.get("locationType") ?? "online") === "in_person"
      ? "in_person"
      : "online";
  const meetingUrl =
    locationType === "online"
      ? String(formData.get("meetingUrl") ?? "").trim()
      : "";
  const locationNote = String(formData.get("locationNote") ?? "").trim();

  await createSessionType(teacher.id, {
    name,
    description: String(formData.get("description") ?? "").trim(),
    durationMinutes,
    priceCents,
    locationType,
    meetingUrl,
    locationNote,
  });

  revalidatePath("/dashboard/schedule");
  redirect("/dashboard/schedule");
}

export async function deleteSessionTypeAction(formData: FormData) {
  const teacher = await requireTeacher();
  const id = String(formData.get("id") ?? "");
  if (id) await deleteSessionType(teacher.id, id);
  revalidatePath("/dashboard/schedule");
  redirect("/dashboard/schedule");
}

export async function saveAvailabilityAction(formData: FormData) {
  const teacher = await requireTeacher();

  // Each weekday row submits enabled + start + end (as HH:MM strings).
  const rules: Array<{
    weekday: number;
    startMinutes: number;
    endMinutes: number;
  }> = [];

  for (let weekday = 0; weekday < 7; weekday++) {
    const enabled = formData.get(`enabled_${weekday}`) === "on";
    if (!enabled) continue;
    const start = parseHHMM(String(formData.get(`start_${weekday}`) ?? ""));
    const end = parseHHMM(String(formData.get(`end_${weekday}`) ?? ""));
    if (start === null || end === null || end <= start) continue;
    rules.push({ weekday, startMinutes: start, endMinutes: end });
  }

  await setAvailability(teacher.id, rules);
  revalidatePath("/dashboard/schedule");
  redirect("/dashboard/schedule?saved=1");
}

function parseHHMM(v: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}
