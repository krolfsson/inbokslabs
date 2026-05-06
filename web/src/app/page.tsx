import { PreviewWorkbench } from "./preview/preview-workbench";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-6">
        <header className="flex items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold tracking-tight text-zinc-950">
              Lithmuth
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-[-0.055em] text-zinc-950 sm:text-6xl lg:text-7xl">
              See the email before it lands.
            </h1>
          </div>
          <p className="hidden max-w-xs pb-2 text-right text-sm leading-6 text-zinc-500 md:block">
            Paste copy or HTML. Preview instantly. Export when it looks right.
          </p>
        </header>

        <PreviewWorkbench />
      </div>
      </main>
  );
}
