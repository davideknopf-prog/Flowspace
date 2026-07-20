import { readDb, updateDb, newId, slugify } from "./db";
import type {
  Teacher,
  SessionType,
  AvailabilityRule,
  Booking,
} from "./types";

// Thin typed accessors over the store. Components/actions call these, never the
// raw db helpers, so the persistence swap stays contained.

export async function getTeacherById(id: string): Promise<Teacher | null> {
  const db = await readDb();
  return db.teachers.find((t) => t.id === id) ?? null;
}

export async function getTeacherBySlug(slug: string): Promise<Teacher | null> {
  const db = await readDb();
  return db.teachers.find((t) => t.slug === slug) ?? null;
}

export async function getTeacherByEmail(email: string): Promise<Teacher | null> {
  const db = await readDb();
  const lower = email.toLowerCase();
  return db.teachers.find((t) => t.email.toLowerCase() === lower) ?? null;
}

async function uniqueSlug(base: string): Promise<string> {
  const db = await readDb();
  const root = slugify(base) || "teacher";
  let candidate = root;
  let n = 2;
  while (db.teachers.some((t) => t.slug === candidate)) {
    candidate = `${root}-${n}`;
    n += 1;
  }
  return candidate;
}

export async function createTeacher(
  email: string,
  name: string,
): Promise<Teacher> {
  const teacher: Teacher = {
    id: newId("tch"),
    slug: await uniqueSlug(name || email.split("@")[0]),
    email,
    name: name || email.split("@")[0],
    headline: "Yoga teacher",
    bio: "",
    location: "",
    specialties: [],
    avatarUrl: "",
    timezone:
      Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
    createdAt: new Date().toISOString(),
  };
  await updateDb((db) => {
    db.teachers.push(teacher);
  });
  return teacher;
}

export async function updateTeacher(
  id: string,
  patch: Partial<Omit<Teacher, "id" | "createdAt">>,
): Promise<Teacher | null> {
  let updated: Teacher | null = null;
  await updateDb((db) => {
    const t = db.teachers.find((x) => x.id === id);
    if (!t) return;
    Object.assign(t, patch);
    updated = t;
  });
  return updated;
}

// --- Session types -----------------------------------------------------------

// Backfill delivery fields for records created before online/in-person existed.
function normalizeSessionType(s: SessionType): SessionType {
  return {
    ...s,
    locationType: s.locationType ?? "online",
    meetingUrl: s.meetingUrl ?? "",
    locationNote: s.locationNote ?? "",
  };
}

export async function listSessionTypes(
  teacherId: string,
): Promise<SessionType[]> {
  const db = await readDb();
  return db.sessionTypes
    .filter((s) => s.teacherId === teacherId)
    .map(normalizeSessionType);
}

export async function createSessionType(
  teacherId: string,
  data: Pick<
    SessionType,
    | "name"
    | "description"
    | "durationMinutes"
    | "priceCents"
    | "locationType"
    | "meetingUrl"
    | "locationNote"
  >,
): Promise<SessionType> {
  const st: SessionType = {
    id: newId("ses"),
    teacherId,
    active: true,
    ...data,
  };
  await updateDb((db) => {
    db.sessionTypes.push(st);
  });
  return st;
}

export async function deleteSessionType(
  teacherId: string,
  id: string,
): Promise<void> {
  await updateDb((db) => {
    db.sessionTypes = db.sessionTypes.filter(
      (s) => !(s.id === id && s.teacherId === teacherId),
    );
  });
}

export async function getSessionType(
  id: string,
): Promise<SessionType | null> {
  const db = await readDb();
  const s = db.sessionTypes.find((s) => s.id === id);
  return s ? normalizeSessionType(s) : null;
}

// --- Availability ------------------------------------------------------------

export async function listAvailability(
  teacherId: string,
): Promise<AvailabilityRule[]> {
  const db = await readDb();
  return db.availability
    .filter((a) => a.teacherId === teacherId)
    .sort((a, b) => a.weekday - b.weekday || a.startMinutes - b.startMinutes);
}

export async function setAvailability(
  teacherId: string,
  rules: Array<Pick<AvailabilityRule, "weekday" | "startMinutes" | "endMinutes">>,
): Promise<void> {
  await updateDb((db) => {
    db.availability = db.availability.filter((a) => a.teacherId !== teacherId);
    for (const r of rules) {
      db.availability.push({ id: newId("avl"), teacherId, ...r });
    }
  });
}

// --- Bookings ----------------------------------------------------------------

export async function listBookings(teacherId: string): Promise<Booking[]> {
  const db = await readDb();
  return db.bookings
    .filter((b) => b.teacherId === teacherId)
    .sort((a, b) => a.startISO.localeCompare(b.startISO));
}

export async function createBooking(
  data: Omit<Booking, "id" | "createdAt" | "status" | "paymentStatus">,
): Promise<Booking> {
  const booking: Booking = {
    id: newId("bkg"),
    status: "confirmed",
    paymentStatus: "stubbed",
    createdAt: new Date().toISOString(),
    ...data,
  };
  await updateDb((db) => {
    db.bookings.push(booking);
  });
  return booking;
}
