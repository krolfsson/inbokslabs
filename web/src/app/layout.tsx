import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: {
    default: "inbokslabs — Förhandsvisning av inkorg och e-post",
    template: "%s — inbokslabs",
  },
  description:
    "Förhandsvisa inkorgsrader och kampanj-mail som mottagaren ser dem. Rubrik och ingress för mobil, HTML-labb och PNG-export.",
  openGraph: {
    title: "inbokslabs",
    description:
      "Verktyg för inkorgsrader och e-postförhandsvisning på riktiga mockups.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sv"
      className={`${inter.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-full flex-col bg-brand-surface text-zinc-900">
        <div className="flex flex-1 flex-col">{children}</div>
        <footer className="border-t border-brand/10 bg-white/80 py-4 text-center">
          <Link
            href="/integritet"
            className="text-sm text-brand transition hover:text-brand-deep"
          >
            Integritet &amp; data
          </Link>
        </footer>
      </body>
    </html>
  );
}
