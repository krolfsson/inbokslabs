"use client";

import html2canvas from "html2canvas";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LAYOUT } from "@/lib/inboxTypography";
import { extractEmailFragment } from "@/lib/emailHtmlUtils";

const W = LAYOUT.iphoneWidthPx;

/** Logical px → raster px width on export (high-res). */
const EXPORT_SCALE = 3;

const PURIFY_OPTIONS = {
  WHOLE_DOCUMENT: false,
  ADD_TAGS: ["style", "picture", "source"],
  ADD_ATTR: [
    "style",
    "class",
    "align",
    "valign",
    "bgcolor",
    "width",
    "height",
    "border",
    "cellpadding",
    "cellspacing",
    "colspan",
    "rowspan",
    "nowrap",
    "target",
    "rel",
    "role",
    "aria-label",
    "media",
    "srcset",
    "sizes",
  ],
};

const SAMPLE_HTML = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <tr><td style="padding:24px 20px 12px;font-size:22px;font-weight:600;color:#111">Weekly digest</td></tr>
  <tr><td style="padding:0 20px 16px;font-size:15px;line-height:1.45;color:#444">Hi there — here is how your campaign could look at full width inside Mail. Tables and inline CSS work best.</td></tr>
  <tr><td style="padding:0 20px 24px;"><a href="#" style="display:inline-block;background:#ff5c47;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:999px;font-size:15px;">Open dashboard</a></td></tr>
  <tr><td style="padding:16px 20px;border-top:1px solid #eee;font-size:12px;color:#888">You are receiving this because you asked for a preview.</td></tr>
</table>`;

export function EmailHtmlDevicePreview() {
  const [rawHtml, setRawHtml] = useState(SAMPLE_HTML);
  const [sanitized, setSanitized] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const captureRootRef = useRef<HTMLDivElement>(null);
  const emailInnerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void import("dompurify").then(({ default: DOMPurify }) => {
      const fragment = extractEmailFragment(rawHtml);
      const clean = DOMPurify.sanitize(fragment, PURIFY_OPTIONS);
      if (!cancelled) setSanitized(clean);
    });
    return () => {
      cancelled = true;
    };
  }, [rawHtml]);

  const hasContent = sanitized.length > 0;

  const previewShellClass = useMemo(
    () =>
      "rounded-[40px] border-[12px] border-[#1c1c1e] bg-[#1c1c1e] shadow-[0_24px_64px_-12px_rgba(0,0,0,0.35)]",
    [],
  );

  const flushLayout = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

  const savePng = useCallback(async () => {
    const root = captureRootRef.current;
    const inner = emailInnerRef.current;
    if (!root || !inner || !hasContent) return;

    setExporting(true);
    setExportError(null);

    const prevH = inner.style.height;
    const prevMinH = inner.style.minHeight;
    const prevOverflow = inner.style.overflow;
    const prevMaxH = inner.style.maxHeight;

    try {
      const h = inner.scrollHeight;
      inner.style.height = `${h}px`;
      inner.style.minHeight = `${h}px`;
      inner.style.maxHeight = "none";
      inner.style.overflow = "visible";

      await flushLayout();

      const canvas = await html2canvas(root, {
        scale: EXPORT_SCALE,
        useCORS: true,
        logging: false,
        backgroundColor: "#1c1c1e",
        width: root.scrollWidth,
        height: root.scrollHeight,
        windowWidth: root.scrollWidth,
        windowHeight: root.scrollHeight,
        foreignObjectRendering: false,
        imageTimeout: 15000,
      });

      await new Promise<void>((res, rej) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              rej(new Error("Empty canvas"));
              return;
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `lithmuth-iphone-email-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
            res();
          },
          "image/png",
          1,
        );
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Export failed.";
      setExportError(msg);
    } finally {
      inner.style.height = prevH;
      inner.style.minHeight = prevMinH;
      inner.style.maxHeight = prevMaxH;
      inner.style.overflow = prevOverflow;
      setExporting(false);
    }
  }, [hasContent]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const t = reader.result;
      if (typeof t === "string") setRawHtml(t);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <section className="mt-12 space-y-6 border-t border-zinc-200 pt-12">
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff5c47]">
          Full email
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
          HTML on iPhone (no status bar)
        </h2>
        <p className="text-sm text-zinc-600">
          Paste or upload HTML. Preview scrolls inside a bezel-only frame — no clock,
          signal bars, or menus. Save a high-resolution PNG of the full email (
          {EXPORT_SCALE}×, ~{W * EXPORT_SCALE}px wide). Remote images need CORS or they
          may be blank in the PNG.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Email HTML
            </span>
            <textarea
              value={rawHtml}
              onChange={(e) => setRawHtml(e.target.value)}
              spellCheck={false}
              className="textarea-email-html h-[min(320px,42vh)] w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-[13px] leading-relaxed text-zinc-800 shadow-sm outline-none focus:border-[#ff5c47]/40 focus:ring-2 focus:ring-[#ff5c47]/20"
              placeholder="Paste HTML or a full &lt;html&gt; document…"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-300">
              <input
                type="file"
                accept=".html,.htm,text/html,.txt"
                className="sr-only"
                onChange={onFile}
              />
              Upload .html
            </label>
            <button
              type="button"
              disabled={!hasContent || exporting}
              onClick={savePng}
              className="inline-flex items-center justify-center rounded-xl bg-[#ff5c47] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e54a38] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting ? "Saving PNG…" : `Save PNG (${EXPORT_SCALE}×)`}
            </button>
          </div>
          {exportError ? (
            <p className="text-sm text-red-600" role="alert">
              {exportError}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col items-center gap-3 lg:items-end">
          <p className="w-full text-center text-[11px] text-zinc-500 lg:text-right">
            {W}px wide · bezel only · PNG includes full email height
          </p>
          <div className="flex max-h-[min(78vh,880px)] justify-center overflow-auto pb-2">
            <div
              ref={captureRootRef}
              className={`inline-block ${previewShellClass}`}
            >
              <div className="overflow-hidden rounded-[32px] bg-white">
                {/* On-screen: scroll; export expands to full height */}
                <div
                  ref={emailInnerRef}
                  className="email-preview-root max-h-[min(72vh,800px)] overflow-y-auto overflow-x-hidden bg-white [overflow-wrap:anywhere]"
                  style={{ width: W, boxSizing: "border-box" }}
                  dangerouslySetInnerHTML={
                    hasContent
                      ? { __html: sanitized }
                      : { __html: "" }
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
