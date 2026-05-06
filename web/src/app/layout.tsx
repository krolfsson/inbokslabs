import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Lithmuth — Email mockups & inbox previews",
    template: "%s — Lithmuth",
  },
  description:
    "Ship inbox-safe copy and pixel-aware HTML. Preview subject lines on iPhone and Android, or mail your campaign and get an iPhone-framed PNG back.",
  openGraph: {
    title: "Lithmuth",
    description:
      "Preview inbox lines and render emails into iPhone mockups without screenshots.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${fraunces.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#f5f5f7] text-zinc-950">
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
