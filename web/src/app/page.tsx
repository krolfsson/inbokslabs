import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#ff5c47]/15 blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(24,24,27,0.07) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <main className="relative mx-auto flex w-full max-w-[1320px] flex-1 flex-col px-4 pb-16 pt-10 sm:px-6 sm:pt-12">
        <section className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#ff5c47]">
            Lithmuth
          </p>
          <h1
            className="mt-3 font-[family-name:var(--font-fraunces)] text-4xl font-semibold leading-[1.1] tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl"
          >
            Email clarity
            <span className="block text-zinc-600">before the screenshot scramble</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-zinc-600">
            Preview how subject and preheader read on iPhone Mail and Android Gmail.
            Send your HTML campaign to a webhook-backed address and get a tall PNG
            back, already framed inside an iPhone silhouette.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/preview"
              className="inline-flex min-h-11 min-w-[180px] items-center justify-center rounded-full bg-[#ff5c47] px-7 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e54a38]"
            >
              Open inbox lab
            </Link>
            <a
              href="#mockup"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-7 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-400"
            >
              Email → PNG mockup
            </a>
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-3">
          <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">Inbox lab</div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              Tune sender, subject, and preheader with live iOS and Gmail-inspired
              surfaces — light and dark — so copy stays legible before you freeze
              creative in Figma.
            </p>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">Headless render</div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              The Go service opens your HTML in Chromium at phone width, captures a
              tall page, then composites a phone frame — ready for decks and QA.
            </p>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">Bring your SMTP</div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              Plug in transactional SMTP (Resend, Postmark, Mailgun…) and replies
              with PNG attachments return automatically to the address that messaged you.
            </p>
          </article>
        </section>

        <section
          id="mockup"
          className="mt-16 scroll-mt-20 rounded-3xl border border-zinc-200 bg-white px-6 py-10 shadow-sm sm:px-10"
        >
          <div className="max-w-2xl">
            <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-zinc-900 sm:text-4xl">
              Wire the render service
            </h2>
            <p className="mt-3 text-zinc-600">
              Deploy{" "}
              <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[13px] text-zinc-800">
                services/render
              </code>{" "}
              to Fly.io, Railway, or any Docker host. Point your inbound provider
              (Mailgun, SendGrid, Postmark) at{" "}
              <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[13px] text-zinc-800">
                POST /v1/inbound
              </code>{" "}
              and set shared secret header{" "}
              <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[13px] text-zinc-800">
                X-Webhook-Secret
              </code>
              .
            </p>
            <ul className="mt-5 list-disc space-y-2 pl-5 text-sm text-zinc-600">
              <li>
                Map SMTP env vars so the service can reply with{" "}
                <span className="font-medium text-zinc-800">lithmuth-mockup.png</span>{" "}
                attached.
              </li>
              <li>
                Supported inbound form fields include{" "}
                <code className="font-mono text-zinc-800">body-html</code>,{" "}
                <code className="font-mono text-zinc-800">body-plain</code>,{" "}
                <code className="font-mono text-zinc-800">sender</code>,{" "}
                <code className="font-mono text-zinc-800">subject</code>.
              </li>
              <li>
                Call{" "}
                <code className="font-mono text-zinc-800">POST /v1/render-test</code>{" "}
                with JSON{" "}
                <code className="font-mono text-zinc-800">{`{ "html": "..." }`}</code>{" "}
                to validate Chromium output (PNG body) before DNS work.
              </li>
            </ul>
          </div>
        </section>

        <footer className="mt-14 border-t border-zinc-200 pt-8 text-center text-xs text-zinc-500">
          Lithmuth — Vercel for the site, Go + Docker for capture. No analytics baked in.
        </footer>
      </main>
    </div>
  );
}
