import { NextRequest, NextResponse } from "next/server";
import { deletePendingBooking } from "@/lib/repo";

// Stripe Checkout's cancel_url. A student who backs out shouldn't have to
// wait the full 30-minute Checkout Session expiry for their slot to free up.
export async function GET(req: NextRequest) {
  const bookingId = req.nextUrl.searchParams.get("bookingId");
  const slug = req.nextUrl.searchParams.get("slug");
  const sessionTypeId = req.nextUrl.searchParams.get("sessionTypeId");

  if (bookingId) {
    await deletePendingBooking(bookingId);
  }

  const dest = new URL(`/t/${slug}/book/${sessionTypeId}`, req.url);
  dest.searchParams.set("error", "Checkout cancelled — your spot wasn't held.");
  return NextResponse.redirect(dest);
}
