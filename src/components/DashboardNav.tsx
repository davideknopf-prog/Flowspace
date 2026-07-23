"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/dashboard", label: "Overview", exact: true },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/schedule", label: "Schedule & pricing" },
  { href: "/dashboard/bookings", label: "Bookings" },
  { href: "/dashboard/audience", label: "Audience" },
  { href: "/dashboard/reviews", label: "Reviews" },
  { href: "/dashboard/earnings", label: "Earnings" },
  { href: "/dashboard/quotes", label: "Quotes" },
  { href: "/dashboard/billing", label: "Billing" },
];

function isActive(pathname: string, item: (typeof ITEMS)[number]) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

// Desktop: vertical sidebar.
export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="w-48 shrink-0 hidden md:block">
      <ul className="space-y-1 sticky top-8">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-brand-tint text-brand-dark font-medium"
                    : "text-muted hover:bg-brand-tint hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Mobile: horizontal scrolling pill bar. Rendered full-width above the page
// content so every dashboard section stays reachable on a phone.
export function DashboardNavMobile() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden -mx-4 px-4 border-b border-border bg-surface">
      <ul className="flex gap-2 overflow-x-auto py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                className={`block whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-brand-dark text-white font-medium"
                    : "bg-brand-tint/60 text-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
