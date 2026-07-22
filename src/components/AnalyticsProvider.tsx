"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { useUser } from "@clerk/nextjs";

// Behavioral analytics (PostHog). Fully inert until NEXT_PUBLIC_POSTHOG_KEY is
// set in the environment — no key, no script, no tracking. Business KPIs
// (revenue, bookings, teachers) live in Postgres; this covers what the DB
// can't: visits, funnels, active users, time on platform.
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

export function AnalyticsProvider() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!key || posthog.__loaded) return;
    posthog.init(key, {
      api_host: host,
      // "defaults" pins PostHog's recommended config snapshot: SPA pageview /
      // pageleave capture on history changes, sane autocapture.
      defaults: "2025-05-24",
    });
  }, []);

  // Tie events to the signed-in teacher (Clerk) so "active users" means
  // people, not anonymous browser profiles. Visitors stay anonymous.
  useEffect(() => {
    if (!key || !isLoaded) return;
    if (user) {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName ?? undefined,
      });
    }
  }, [user, isLoaded]);

  return null;
}
