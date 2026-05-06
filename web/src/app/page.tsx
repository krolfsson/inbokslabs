import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#ff5c47]/20 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.2]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-24 pt-14 sm:px-6 sm:pt-20">
        <section className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#ff6a55]">
            Lithmuth
          </p>
          <h1
            className="mt-4 font-[family-name:var(--font-fraunces)] text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            Email clarity
            <span className="block text-zinc-300">before the screenshot scramble</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400">
            Preview how subject and preheader read on iPhone Mail and Android Gmail.
            Send your HTML campaign to a webhook-backed address and get a tall PNG
            back, already framed inside an iPhone silhouette.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/preview"
              className="inline-flex min-h-12 min-w-[200px] items-center justify-center rounded-full bg-[#ff5c47] px-8 text-sm font-semibold text-black shadow-[0_0_40px_-10px_rgba(255,92,71,0.8)] transition hover:bg-[#ff7a63]"
            >
              Open inbox lab
            </Link>
            <a
              href="#mockup"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-8 text-sm font-medium text-zinc-200 transition hover:border-white/30 hover:text-white"
            >
              Email → PNG mockup
            </a>
          </div>
        </section>

        <section className="mt-24 grid gap-10 lg:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]">
            <div className="text-sm font-semibold text-white">Inbox lab</div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Tune sender, subject, and preheader with live iOS and Gmail-inspired
              surfaces — light and dark — so copy stays legible before you freeze
              creative in Figma.
            </p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]">
            <div className="text-sm font-semibold text-white">Headless render</div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              The Go service opens your HTML in Chromium at phone width, captures a
              tall page, then composites a phone frame — ready for decks and QA.
            </p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]">
            <div className="text-sm font-semibold text-white">Bring your SMTP</div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Plug in transactional SMTP (Resend, Postmark, Mailgun…) and replies
              with PNG attachments return automatically to the address that messaged you.
            </p>
          </article>
        </section>

        <section
          id="mockup"
          className="mt-28 scroll-mt-24 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent px-6 py-12 sm:px-10"
        >
          <div className="max-w-2xl">
            <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-white sm:text-4xl">
              Wire the render service
            </h2>
            <p className="mt-4 text-zinc-400">
              Deploy{" "}
              <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[13px] text-zinc-200">
                services/render
              </code>{" "}
              to Fly.io, Railway, or any Docker host. Point your inbound provider
              (Mailgun, SendGrid, Postmark) at{" "}
              <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[13px] text-zinc-200">
                POST /v1/inbound
              </code>{" "}
              and set shared secret header{" "}
              <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[13px] text-zinc-200">
                X-Webhook-Secret
              </code>
              .
            </p>
            <ul className="mt-6 list-disc space-y-2 pl-5 text-sm text-zinc-400">
              <li>
                Map SMTP env vars so the service can reply with{" "}
                <span className="text-zinc-200">lithmuth-mockup.png</span> attached.
              </li>
              <li>
                Supported inbound form fields include{" "}
                <code className="font-mono text-zinc-300">body-html</code>,{" "}
                <code className="font-mono text-zinc-300">body-plain</code>,{" "}
                <code className="font-mono text-zinc-300">sender</code>,{" "}
                <code className="font-mono text-zinc-300">subject</code>.
              </li>
              <li>
                Call{" "}
                <code className="font-mono text-zinc-300">POST /v1/render-test</code>{" "}
                with JSON <code className="font-mono text-zinc-300">{`{ "html": "..." }`}</code>{" "}
                to validate Chromium output (PNG body) before DNS work.
              </li>
            </ul>
          </div>
        </section>

        <footer className="mt-24 border-t border-white/10 pt-10 text-center text-xs text-zinc-500">
          Lithmuth — Vercel for the site, Go + Docker for capture. No analytics baked in.
        </footer>
      </main>
    </div>
  );
}
