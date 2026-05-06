import { InboksLabsWordmark } from "@/components/InboksLabsLogo";
import { PreviewWorkbench } from "./preview/preview-workbench";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <InboksLabsWordmark className="mb-1 block" />
            <h1 className="mt-4 max-w-3xl font-sans text-4xl font-semibold tracking-[-0.04em] text-zinc-950 sm:text-5xl lg:text-6xl">
              Se mejlet innan det landar i inkorgen.
            </h1>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-zinc-600 sm:pb-1">
            Förhandsvisa rubrik och ingress i mobil, eller klistra in hela HTML för
            pixelkontroll och PNG-export — ett labb för riktiga inkorgslägen.
          </p>
        </header>

        <PreviewWorkbench />
      </div>
    </main>
  );
}
