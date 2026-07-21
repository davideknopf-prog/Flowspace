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
];

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="w-48 shrink-0 hidden md:block">
      <ul className="space-y-1 sticky top-8">
        {ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
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
