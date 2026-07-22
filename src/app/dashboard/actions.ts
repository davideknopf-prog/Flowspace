"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getCurrentTeacher,
  getViewerContext,
  setViewAsCookie,
  clearViewAsCookie,
} from "@/lib/session";
import {
  updateTeacher,
  getTeacherBySlug,
  getTeacherById,
  createSessionType,
  deleteSessionType,
  setAvailability,
  createOffer,
  deleteOffer,
  createClassEvent,
  deleteClassEvent,
  getSessionType,
  markPayoutRequestPaid,
} from "@/lib/repo";
import { sendCashOutPaidEmail } from "@/lib/email";
import { slugify } from "@/lib/db";
import { SESSION_TEMPLATES, OFFER_TEMPLATES } from "@/lib/sku-templates";

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
    bannerUrl: String(formData.get("bannerUrl") ?? "").trim(),
    // Only a plain hex color ever reaches inline styles on the public page.
    brandColor: /^#[0-9a-fA-F]{6}$/.test(String(formData.get("brandColor") ?? ""))
      ? String(formData.get("brandColor"))
      : "",
    timezone: String(formData.get("timezone") ?? "").trim() || teacher.timezone,
    defaultMeetingUrl: String(formData.get("defaultMeetingUrl") ?? "").trim(),
    contactPhone: String(formData.get("contactPhone") ?? "").trim().slice(0, 30),
    contactEmail: String(formData.get("contactEmail") ?? "").trim().slice(0, 200),
    confirmationNote: String(formData.get("confirmationNote") ?? "").trim().slice(0, 1000),
    followupNote: String(formData.get("followupNote") ?? "").trim().slice(0, 1000),
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

  const scheduling =
    String(formData.get("scheduling") ?? "events") === "flexible"
      ? ("flexible" as const)
      : ("events" as const);
  const capacityRaw = Number(formData.get("capacity") ?? 0);
  const capacity =
    Number.isFinite(capacityRaw) && capacityRaw >= 1
      ? Math.min(500, Math.round(capacityRaw))
      : null;

  await createSessionType(teacher.id, {
    name,
    description: String(formData.get("description") ?? "").trim(),
    durationMinutes,
    priceCents,
    scheduling,
    capacity,
    confirmationNote: String(formData.get("confirmationNote") ?? "").trim(),
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

// --- Class events -------------------------------------------------------------
// A class IS an event. Teachers schedule weekly recurring times ("every
// Tuesday, 6:00 PM") or one-off dates per class.

export async function addClassEventAction(formData: FormData) {
  const teacher = await requireTeacher();
  const sessionTypeId = String(formData.get("sessionTypeId") ?? "");
  const sessionType = await getSessionType(sessionTypeId);
  if (!sessionType || sessionType.teacherId !== teacher.id) {
    redirect("/dashboard/schedule?error=Class+not+found");
  }

  const kind = String(formData.get("kind") ?? "weekly");
  if (kind === "once") {
    // datetime-local arrives as wall-clock in the teacher's tz; convert.
    const raw = String(formData.get("startAtLocal") ?? "");
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(raw);
    if (!m) redirect("/dashboard/schedule?error=Pick+a+date+and+time");
    const startAt = wallToUtcISO(
      Number(m![1]), Number(m![2]), Number(m![3]),
      Number(m![4]) * 60 + Number(m![5]),
      teacher.timezone,
    );
    if (new Date(startAt).getTime() < Date.now()) {
      redirect("/dashboard/schedule?error=That+date+is+in+the+past");
    }
    await createClassEvent(teacher.id, {
      sessionTypeId,
      kind: "once",
      weekday: null,
      startMinutes: null,
      startAt,
    });
  } else {
    const weekday = Math.max(0, Math.min(6, Number(formData.get("weekday") ?? 0)));
    const start = parseHHMM(String(formData.get("time") ?? ""));
    if (start === null) redirect("/dashboard/schedule?error=Pick+a+time");
    await createClassEvent(teacher.id, {
      sessionTypeId,
      kind: "weekly",
      weekday,
      startMinutes: start,
      startAt: null,
    });
  }

  revalidatePath("/dashboard/schedule");
  redirect("/dashboard/schedule");
}

export async function deleteClassEventAction(formData: FormData) {
  const teacher = await requireTeacher();
  const id = String(formData.get("id") ?? "");
  if (id) await deleteClassEvent(teacher.id, id);
  revalidatePath("/dashboard/schedule");
  redirect("/dashboard/schedule");
}

// Wall-clock (Y/M/D + minutes) in an IANA timezone -> UTC ISO string.
function wallToUtcISO(
  year: number,
  month: number,
  day: number,
  minutes: number,
  timeZone: string,
): string {
  const naiveUtc = Date.UTC(year, month - 1, day) + minutes * 60_000;
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone, hour12: false, year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(naiveUtc));
  const map: Record<string, number> = {};
  for (const p of parts) if (p.type !== "literal") map[p.type] = Number(p.value);
  const asUTC = Date.UTC(map.year, map.month - 1, map.day,
    map.hour === 24 ? 0 : map.hour, map.minute, map.second);
  return new Date(naiveUtc - (asUTC - naiveUtc)).toISOString();
}

// --- Offers (multi-class passes) ---------------------------------------------

export async function addOfferAction(formData: FormData) {
  const teacher = await requireTeacher();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/dashboard/schedule?error=Offer+name+is+required");

  const dollars = Math.max(0, Number(formData.get("price") ?? 0) || 0);
  const kind = String(formData.get("kind") ?? "credits");
  const creditCount =
    kind === "unlimited"
      ? null
      : Math.max(1, Math.min(100, Number(formData.get("creditCount") ?? 5) || 5));
  const validDaysRaw = Number(formData.get("validDays") ?? 0) || 0;
  // Unlimited passes must expire (otherwise they'd be infinite classes for
  // one payment); credit passes may run forever.
  const validDays =
    kind === "unlimited"
      ? Math.max(1, validDaysRaw || 30)
      : validDaysRaw > 0
        ? validDaysRaw
        : null;

  await createOffer(teacher.id, {
    name,
    description: String(formData.get("description") ?? "").trim(),
    priceCents: Math.round(dollars * 100),
    creditCount,
    validDays,
  });

  revalidatePath("/dashboard/schedule");
  redirect("/dashboard/schedule");
}

export async function deleteOfferAction(formData: FormData) {
  const teacher = await requireTeacher();
  const id = String(formData.get("id") ?? "");
  if (id) await deleteOffer(teacher.id, id);
  revalidatePath("/dashboard/schedule");
  redirect("/dashboard/schedule");
}

// One-click SKU templates: prebuilt sessions and passes teachers can add and
// then customize (or delete) freely.
export async function addSessionTemplateAction(formData: FormData) {
  const teacher = await requireTeacher();
  const key = String(formData.get("key") ?? "");
  const tpl = SESSION_TEMPLATES.find((t) => t.key === key);
  if (tpl) {
    await createSessionType(teacher.id, {
      name: tpl.name,
      description: tpl.description,
      durationMinutes: tpl.durationMinutes,
      priceCents: Math.round(tpl.priceDollars * 100),
      scheduling: "events",
      capacity: null,
      confirmationNote: "",
      locationType: tpl.locationType,
      meetingUrl: "",
      locationNote: "",
    });
  }
  revalidatePath("/dashboard/schedule");
  redirect("/dashboard/schedule");
}

export async function addOfferTemplateAction(formData: FormData) {
  const teacher = await requireTeacher();
  const key = String(formData.get("key") ?? "");
  const tpl = OFFER_TEMPLATES.find((t) => t.key === key);
  if (tpl) {
    await createOffer(teacher.id, {
      name: tpl.name,
      description: tpl.description,
      priceCents: Math.round(tpl.priceDollars * 100),
      creditCount: tpl.creditCount,
      validDays: tpl.validDays,
    });
  }
  revalidatePath("/dashboard/schedule");
  redirect("/dashboard/schedule");
}

// --- Founder operator tools --------------------------------------------------

// "View as" — founder-only impersonation for demos. The cookie makes every
// dashboard page render the target teacher's data; the layout shows an exit
// banner. Both actions verify the REAL signed-in viewer is a founder.
export async function viewAsAction(formData: FormData) {
  const ctx = await getViewerContext();
  if (!ctx?.isFounderViewer) redirect("/dashboard");
  const teacherId = String(formData.get("teacherId") ?? "");
  if (teacherId) await setViewAsCookie(teacherId);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function exitViewAsAction() {
  const ctx = await getViewerContext();
  if (ctx?.isFounderViewer) await clearViewAsCookie();
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

// Founder clicked "Mark paid" on a cash-out request — AFTER actually sending
// the money on the P2P app. Records the payout (so the teacher's balance
// drops) and emails them the good news. Idempotent: a double click finds the
// request already paid and does nothing.
export async function markPayoutRequestPaidAction(formData: FormData) {
  const ctx = await getViewerContext();
  if (!ctx?.isFounderViewer) redirect("/dashboard");

  const requestId = String(formData.get("requestId") ?? "");
  if (requestId) {
    const request = await markPayoutRequestPaid(requestId);
    if (request) {
      const teacher = await getTeacherById(request.teacherId);
      if (teacher) await sendCashOutPaidEmail({ teacher, request });
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/earnings");
  redirect("/dashboard");
}
