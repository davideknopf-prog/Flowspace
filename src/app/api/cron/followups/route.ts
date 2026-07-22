import { NextRequest, NextResponse } from "next/server";
import {
  listBookingsDueFollowup,
  markFollowupSent,
  getTeacherById,
  getSessionType,
  listSessionTypes,
  listClassEvents,
  listBookings,
  listOffers,
} from "@/lib/repo";
import { computeOccurrences } from "@/lib/events";
import { sendFollowupEmail, type FollowupUpcoming } from "@/lib/email";
import { formatSlot } from "@/lib/format";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily post-class follow-up: review ask + upcoming classes + upsell, in the
// teacher's voice. Triggered by Vercel Cron (see vercel.json). Idempotent —
// each booking is followed up exactly once (followup_sent_at).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kuleo.io";
  const due = await listBookingsDueFollowup();

  // Per-teacher context cache — several bookings often share a teacher.
  const teacherCtx = new Map<
    string,
    Awaited<ReturnType<typeof buildTeacherContext>>
  >();

  async function buildTeacherContext(teacherId: string) {
    const teacher = await getTeacherById(teacherId);
    if (!teacher) return null;
    const [sessions, events, bookings, offers] = await Promise.all([
      listSessionTypes(teacherId),
      listClassEvents(teacherId),
      listBookings(teacherId),
      listOffers(teacherId),
    ]);
    const active = sessions.filter((s) => s.active);
    const byId = new Map(active.map((s) => [s.id, s]));
    const upcoming: FollowupUpcoming[] = computeOccurrences({
      now: new Date(),
      timeZone: teacher.timezone,
      events,
      sessionTypes: active,
      bookings,
      days: 7,
    })
      .filter((o) => o.spotsLeft !== 0)
      .slice(0, 3)
      .flatMap((o) => {
        const s = byId.get(o.sessionTypeId);
        if (!s) return [];
        return [
          {
            label: `${formatSlot(o.startISO, teacher.timezone)} — ${s.name}`,
            url: `${origin}/t/${teacher.slug}/book/${s.id}?start=${encodeURIComponent(o.startISO)}`,
          },
        ];
      });
    return {
      teacher,
      upcoming,
      offers: offers.filter((o) => o.active).slice(0, 3),
      flexibleSessions: active
        .filter((s) => s.scheduling === "flexible")
        .slice(0, 2),
    };
  }

  let sent = 0;
  let skipped = 0;

  for (const booking of due) {
    try {
      let ctx = teacherCtx.get(booking.teacherId);
      if (ctx === undefined) {
        ctx = await buildTeacherContext(booking.teacherId);
        teacherCtx.set(booking.teacherId, ctx);
      }
      const sessionType = await getSessionType(booking.sessionTypeId);
      if (!ctx || !sessionType) {
        await markFollowupSent(booking.id); // never retry-loop a broken row
        skipped++;
        continue;
      }

      const reviewUrl =
        `${origin}/t/${ctx.teacher.slug}/review` +
        `?name=${encodeURIComponent(booking.clientName)}` +
        `&email=${encodeURIComponent(booking.clientEmail)}`;

      await sendFollowupEmail({
        booking,
        teacher: ctx.teacher,
        sessionType,
        reviewUrl,
        upcoming: ctx.upcoming,
        offers: ctx.offers,
        flexibleSessions: ctx.flexibleSessions,
        siteOrigin: origin,
      });
      await markFollowupSent(booking.id);
      sent++;
    } catch (err) {
      // Leave followup_sent_at null — tomorrow's run retries (within the
      // 3-day window), and one bad row never blocks the batch.
      console.error(`[followups] failed for booking ${booking.id}:`, err);
    }
  }

  return NextResponse.json({ due: due.length, sent, skipped });
}
