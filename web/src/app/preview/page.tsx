import type { Metadata } from "next";
import { PreviewWorkbench } from "./preview-workbench";

export const metadata: Metadata = {
  title: "Preview — Lithmuth",
  description:
    "Inbox line preview and full HTML email in an iPhone frame — Lithmuth.",
};

export default function PreviewPage() {
  return (
    <main className="flex flex-1 flex-col bg-zinc-50/90 px-4 py-8 sm:px-6 sm:py-10">
      <PreviewWorkbench />
    </main>
  );
}
