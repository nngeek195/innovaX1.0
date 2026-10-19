import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InnovaX 1.0 | CS Chapter USL",
  description:
    "InnovaX 1.0 — The premier hackathon organized by the CS Chapter of the University of Sri Lanka. Compete, innovate, and build the future.",
  metadataBase: new URL("https://innovax.cschaptersusl.org"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "InnovaX 1.0 | CS Chapter USL",
    description:
      "InnovaX 1.0 — The premier hackathon organized by the CS Chapter of the University of Sri Lanka.",
    url: "https://innovax.cschaptersusl.org",
    siteName: "InnovaX",
    locale: "en_US",
    type: "website",
  },
  verification: {
    google: "UmPFyWPlpWtuzUqNLgG3M-PO67F9w-OMHaJq8463s84",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
