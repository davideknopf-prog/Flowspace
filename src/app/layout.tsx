import type { Metadata } from "next";
import { Geist, Fraunces } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Display serif for headlines — the "grounded premium" counterpoint to the
// calm sans body. Warm, characterful, a little literary.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata: Metadata = {
  title: "Kuleo — the operating system for independent yoga teachers",
  description:
    "Kuleo is the all-in-one business platform for solo yoga teachers — like Mindbody, rebuilt for the independent teacher. Scheduled classes, bookings, payments, class passes, and student follow-ups from one link, for a flat $15/month plus a simple 6% processing fee. Make yoga available to everyone by making it pay to teach.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          {children}
          <AnalyticsProvider />
        </body>
      </html>
    </ClerkProvider>
  );
}
