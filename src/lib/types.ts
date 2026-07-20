// Core domain models for the yoga teacher OS.
// Kept deliberately plain so this maps 1:1 onto Postgres tables when we swap
// the JSON store for Supabase later.

export interface Teacher {
  id: string;
  slug: string; // public URL handle, e.g. /t/jane-doe
  email: string;
  name: string;
  headline: string; // short tagline shown on public page
  bio: string;
  location: string;
  specialties: string[];
  avatarUrl: string; // may be empty; we render initials fallback
  timezone: string; // IANA, e.g. "America/New_York"
  createdAt: string;
}

export type LocationType = "online" | "in_person";

export interface SessionType {
  id: string;
  teacherId: string;
  name: string; // e.g. "Private Vinyasa (1:1)"
  description: string;
  durationMinutes: number;
  priceCents: number; // stored in cents; 0 = free/donation
  active: boolean;
  // How the class is delivered.
  locationType: LocationType;
  // For online: the teacher's own Zoom/Meet link (BYO — no video API yet).
  meetingUrl: string;
  // For in-person: the studio/home address. For online: optional extra notes
  // ("I'll admit you from the waiting room a few minutes early").
  locationNote: string;
}

// Weekly recurring availability. weekday: 0=Sun … 6=Sat.
// start/end are minutes from midnight in the teacher's timezone.
export interface AvailabilityRule {
  id: string;
  teacherId: string;
  weekday: number;
  startMinutes: number;
  endMinutes: number;
}

export type BookingStatus = "confirmed" | "cancelled";

export interface Booking {
  id: string;
  teacherId: string;
  sessionTypeId: string;
  clientName: string;
  clientEmail: string;
  note: string;
  startISO: string; // absolute start time (UTC ISO)
  durationMinutes: number;
  priceCents: number;
  // Snapshot of delivery details at booking time, so editing a session type
  // later never rewrites the link/address a past student was given.
  locationType: LocationType;
  meetingUrl: string;
  locationNote: string;
  // Payment is stubbed for now. When Stripe Connect lands, this becomes a real
  // status driven by webhooks (requires_payment | paid | refunded …).
  paymentStatus: "stubbed" | "paid" | "unpaid";
  status: BookingStatus;
  createdAt: string;
}

export interface Database {
  teachers: Teacher[];
  sessionTypes: SessionType[];
  availability: AvailabilityRule[];
  bookings: Booking[];
}
