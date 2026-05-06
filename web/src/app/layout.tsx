import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Lithmuth — Förhandsvisning av inkorg och e-post",
    template: "%s — Lithmuth",
  },
  description:
    "Skriv säkra rubriker och förhandsvisa HTML och inkorgsrader. Se hur ämnesrad och ingress ser ut på iPhone och Android, eller exportera kampanjen som PNG.",
  openGraph: {
    title: "Lithmuth",
    description:
      "Förhandsvisa inkorgsrader och hela nyhetsbrev utan krångliga skärmdumpar.",
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
      className={`${dmSans.variable} ${fraunces.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#f5f5f7] text-zinc-950">
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
