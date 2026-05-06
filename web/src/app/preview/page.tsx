import type { Metadata } from "next";
import { PreviewLab } from "./preview-lab";

export const metadata: Metadata = {
  title: "Inbox lab — Lithmuth",
  description:
    "Preview subject line and preheader as they appear on iPhone Mail and Android Gmail.",
};

export default function PreviewPage() {
  return (
    <div className="relative flex flex-1 flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ff5c47]">
            Inbox lab
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Shape how the inbox reads your story
          </h1>
          <p className="mt-3 text-zinc-400">
            Dial in sender name, subject, and preheader — see the one-line summary
            iPhone Mail and Android Gmail surface before the open.
          </p>
        </div>
        <PreviewLab />
      </main>
    </div>
  );
}
