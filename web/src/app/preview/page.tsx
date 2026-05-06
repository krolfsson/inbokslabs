import type { Metadata } from "next";
import { PreviewLab } from "./preview-lab";

export const metadata: Metadata = {
  title: "Inbox lab — Lithmuth",
  description:
    "Preview subject line and preheader as they appear on iPhone Mail and Android Gmail.",
};

export default function PreviewPage() {
  return (
    <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <PreviewLab />
    </main>
  );
}
