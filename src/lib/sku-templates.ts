// Prebuilt SKU templates teachers can add with one click while setting up.
// Everything stays fully customizable — these just give structure for how to
// monetize (the founder's "here's how studios price" starting menu).

export interface SessionTemplate {
  key: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceDollars: number;
  locationType: "online" | "in_person";
}

export interface OfferTemplate {
  key: string;
  name: string;
  description: string;
  priceDollars: number;
  creditCount: number | null; // null = unlimited
  validDays: number | null;
}

export const SESSION_TEMPLATES: SessionTemplate[] = [
  {
    key: "vinyasa_1on1",
    name: "Vinyasa 1:1",
    description: "A private flow tailored to your level and goals",
    durationMinutes: 60,
    priceDollars: 75,
    locationType: "online",
  },
  {
    key: "vinyasa_group",
    name: "Vinyasa Group Class",
    description: "All-levels group flow",
    durationMinutes: 60,
    priceDollars: 20,
    locationType: "online",
  },
  {
    key: "coaching",
    name: "Coaching Session",
    description: "1:1 guidance on practice, goals, and lifestyle",
    durationMinutes: 45,
    priceDollars: 90,
    locationType: "online",
  },
  {
    key: "in_person_event",
    name: "In-Person Event",
    description: "Special session — bring a friend and a mat",
    durationMinutes: 90,
    priceDollars: 35,
    locationType: "in_person",
  },
];

export const OFFER_TEMPLATES: OfferTemplate[] = [
  {
    key: "pass_5",
    name: "5-Class Pass",
    description: "Five classes, use any time within 3 months",
    priceDollars: 90,
    creditCount: 5,
    validDays: 90,
  },
  {
    key: "pass_10",
    name: "10-Class Pass",
    description: "Ten classes, use any time within 6 months",
    priceDollars: 170,
    creditCount: 10,
    validDays: 180,
  },
  {
    key: "unlimited_month",
    name: "Unlimited Monthly",
    description: "Unlimited classes for 30 days",
    priceDollars: 120,
    creditCount: null,
    validDays: 30,
  },
];
