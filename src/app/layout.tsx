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
  title: "Kuleo — bookings, payments & scheduling for yoga teachers",
  description:
    "Kuleo helps yoga teachers run their online yoga business from one link — bookings, payments, yoga scheduling, class passes, and student relationships. Teach yoga; we'll handle the rest.",
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
