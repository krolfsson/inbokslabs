"use client";

import html2canvas from "html2canvas";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";
import {
  parseEmailForPreview,
  resolveRelativeAssetUrls,
  stripDangerousCss,
} from "@/lib/emailHtmlUtils";
import { sanitizeClonedDocumentForHtml2Canvas } from "@/lib/html2canvasCssFix";

/** Full HTML preview artboard (typical email width). Inbox tabs still use 390px device mockups. */
const W = 600;

const EXPORT_SCALE = 3;

/** Email-like HTML: allow classes, tables, inline CSS (profiles + extras). */
const PURIFY_BODY = {
  USE_PROFILES: { html: true },
  ADD_TAGS: [
    "style",
    "picture",
    "source",
    "main",
    "section",
    "article",
    "center",
    "font",
  ],
  ADD_ATTR: [
    "style",
    "class",
    "id",
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
    "aria-hidden",
    "media",
    "srcset",
    "sizes",
    "dir",
    "lang",
    "title",
    "alt",
    "name",
    "content",
    "http-equiv",
    "face",
    "color",
    "size",
    "href",
    "src",
  ],
};

function inlineStyleToObject(css: string | undefined): CSSProperties | undefined {
  if (!css?.trim()) return undefined;
  const out: Record<string, string> = {};
  for (const part of css.split(";")) {
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    const rawKey = part.slice(0, idx).trim().toLowerCase();
    const val = part.slice(idx + 1).trim();
    if (!rawKey || !val) continue;
    const camel = rawKey.replace(/-([a-z])/g, (_, g: string) =>
      g.toUpperCase(),
    );
    if (rawKey === "float" || camel === "float") {
      Object.assign(out, { float: val });
      continue;
    }
    (out as Record<string, string>)[camel] = val;
  }
  return out as CSSProperties;
}

/** No Tailwind on capture subtree — TW4 uses oklch/lab; html2canvas parser dies. */
const FRAME_OUTER: CSSProperties = {
  display: "inline-block",
  borderRadius: 40,
  border: "12px solid #1c1c1e",
  backgroundColor: "#1c1c1e",
  boxShadow: "0 24px 64px -12px rgba(0,0,0,0.35)",
};

const FRAME_SCREEN: CSSProperties = {
  borderRadius: 32,
  overflow: "hidden",
  backgroundColor: "#ffffff",
};

const FRAME_SCROLL: CSSProperties = {
  maxHeight: "min(72vh, 800px)",
  overflowY: "auto",
  /** Typical campaigns are 600px wide — allow horizontal scroll inside the device width. */
  overflowX: "auto",
  overflowWrap: "anywhere",
  width: W,
  minWidth: 0,
  boxSizing: "border-box",
};

/**
 * Injected after campaign &lt;style&gt; blocks so it wins over mobile @media rules that set
 * footer td { display:block } when the browser viewport is narrow, and fixes CTA corner clipping.
 */
const EMAIL_PREVIEW_OVERRIDE_CSS = `
@media screen and (max-width: 600px) {
  [data-email-root] table.links-sm,
  [data-email-root] table[class*="links-sm"] {
    display: table !important;
    width: auto !important;
    max-width: 100% !important;
  }
  [data-email-root] table.links-sm tbody,
  [data-email-root] table[class*="links-sm"] tbody {
    display: table-row-group !important;
  }
  [data-email-root] table.links-sm tr,
  [data-email-root] table[class*="links-sm"] tr {
    display: table-row !important;
  }
  [data-email-root] table.links-sm td,
  [data-email-root] table[class*="links-sm"] td {
    display: table-cell !important;
    width: auto !important;
    max-width: none !important;
    vertical-align: middle !important;
  }
  [data-email-root] .sf-links table.links-i td,
  [data-email-root] table.links-i td {
    display: table-cell !important;
  }
}
[data-email-root] table.cta-btn > tbody > tr > td {
  overflow: hidden !important;
  box-sizing: border-box !important;
}
[data-email-root] table.cta-btn .fix-btn {
  overflow: hidden !important;
}
`.trim();

const SAMPLE_HTML = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <tr><td style="padding:24px 20px 12px;font-size:22px;font-weight:600;color:#111">Weekly digest</td></tr>
  <tr><td style="padding:0 20px 16px;font-size:15px;line-height:1.45;color:#444">Hi there — here is how your campaign could look at full width inside Mail. Tables and inline CSS work best.</td></tr>
  <tr><td style="padding:0 20px 24px;"><a href="#" style="display:inline-block;background:#ff5c47;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:999px;font-size:15px;">Open dashboard</a></td></tr>
  <tr><td style="padding:16px 20px;border-top:1px solid #eee;font-size:12px;color:#888">You are receiving this because you asked for a preview.</td></tr>
</table>`;

type PreviewPayload = {
  styleTexts: string[];
  bodyHtml: string;
  bodyClass?: string;
  bodyStyle?: string;
};

export function EmailHtmlDevicePreview({
  embedded = false,
}: {
  embedded?: boolean;
} = {}) {
  const [rawHtml, setRawHtml] = useState(SAMPLE_HTML);
  /** Folder or origin where relative <img src> paths resolve (e.g. https://cdn.example.com/campaign/). */
  const [assetBaseUrl, setAssetBaseUrl] = useState("");
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const captureRootRef = useRef<HTMLDivElement>(null);
  const frameScreenRef = useRef<HTMLDivElement>(null);
  const emailInnerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void import("dompurify").then(({ default: DOMPurify }) => {
      const parsed = parseEmailForPreview(rawHtml);
      const withUrls = resolveRelativeAssetUrls(
        parsed.bodyHtml,
        assetBaseUrl,
      );
      const cleanBody = DOMPurify.sanitize(withUrls, PURIFY_BODY);
      const styleTexts = parsed.styleTexts.map(stripDangerousCss);
      if (!cancelled) {
        setPreview({
          styleTexts,
          bodyHtml: cleanBody,
          bodyClass: parsed.bodyClass,
          bodyStyle: parsed.bodyElementStyle,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [rawHtml, assetBaseUrl]);

  const hasContent = (preview?.bodyHtml.length ?? 0) > 0;

  const bodyStyleObj = useMemo(
    () => inlineStyleToObject(preview?.bodyStyle),
    [preview?.bodyStyle],
  );

  const flushLayout = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

  /** Let remote images decode before rasterizing (avoids empty / black regions in PNG). */
  const waitForImages = (root: HTMLElement) =>
    Promise.all(
      Array.from(root.querySelectorAll("img")).map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
              return;
            }
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
          }),
      ),
    );

  const savePng = useCallback(async () => {
    const root = captureRootRef.current;
    const inner = emailInnerRef.current;
    const screen = frameScreenRef.current;
    if (!root || !inner || !hasContent) return;

    setExporting(true);
    setExportError(null);

    const prevH = inner.style.height;
    const prevMinH = inner.style.minHeight;
    const prevOverflowX = inner.style.overflowX;
    const prevOverflowY = inner.style.overflowY;
    const prevMaxH = inner.style.maxHeight;
    const prevScreenOv = screen?.style.overflow;

    try {
      if (screen) screen.style.overflow = "visible";

      const h = inner.scrollHeight;
      inner.style.height = `${h}px`;
      inner.style.minHeight = `${h}px`;
      inner.style.maxHeight = "none";
      inner.style.removeProperty("overflow");
      inner.style.overflowX = "visible";
      inner.style.overflowY = "visible";

      await flushLayout();
      await waitForImages(inner);
      if (typeof document !== "undefined" && document.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch {
          /* ignore */
        }
      }
      await flushLayout();

      /**
       * `foreignObjectRendering: true` often yields a fully black/blank PNG in Chromium.
       * Omit explicit width/height/window* — wrong values prevent painting. Color strips in onclone
       * keep the default (non-FO) path compatible with email CSS.
       */
      const canvas = await html2canvas(root, {
        scale: EXPORT_SCALE,
        useCORS: true,
        logging: false,
        backgroundColor: "#1c1c1e",
        foreignObjectRendering: false,
        imageTimeout: 20000,
        onclone: (clonedDoc) => {
          sanitizeClonedDocumentForHtml2Canvas(clonedDoc);
        },
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
      inner.style.removeProperty("overflow");
      inner.style.overflowX = prevOverflowX || "auto";
      inner.style.overflowY = prevOverflowY || "auto";
      if (screen) screen.style.overflow = prevScreenOv ?? "";
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
    <section className={embedded ? "" : "mt-12"}>
      <div className="grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-10">
        <div className="rounded-[30px] bg-zinc-50/90 p-5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-[-0.035em] text-zinc-950">
              Email preview
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Paste HTML or a raw email.
            </p>
          </div>

          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-medium text-zinc-500">
                Email
              </span>
              <textarea
                value={rawHtml}
                onChange={(e) => setRawHtml(e.target.value)}
                spellCheck={false}
                className="textarea-email-html h-[min(430px,54vh)] w-full resize-none rounded-2xl border border-transparent bg-zinc-100/80 px-4 py-3 font-mono text-[12px] leading-relaxed text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,0,0,0.04)]"
                placeholder="Paste HTML or .eml source"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-medium text-zinc-500">
                Image base URL
              </span>
              <input
                type="url"
                value={assetBaseUrl}
                onChange={(e) => setAssetBaseUrl(e.target.value)}
                className="w-full rounded-2xl border border-transparent bg-zinc-100/80 px-4 py-3 text-[15px] text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,0,0,0.04)]"
                placeholder="Optional"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-zinc-950 shadow-[0_1px_10px_rgba(0,0,0,0.08)] transition hover:bg-zinc-50">
                <input
                  type="file"
                  accept=".html,.htm,.eml,text/html,.txt"
                  className="sr-only"
                  onChange={onFile}
                />
                Upload
              </label>
              <button
                type="button"
                disabled={!hasContent || exporting}
                onClick={savePng}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white shadow-[0_1px_10px_rgba(0,0,0,0.16)] transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {exporting ? "Saving…" : "Save PNG"}
              </button>
            </div>
            {exportError ? (
              <p className="text-sm text-red-600" role="alert">
                {exportError}
              </p>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 rounded-[30px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold tracking-tight text-zinc-900">
              Preview
            </span>
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500">
              {W}px
            </span>
          </div>
          <div className="flex max-h-[min(74vh,880px)] justify-center overflow-auto pb-2">
            <div ref={captureRootRef} data-lith="frame" style={FRAME_OUTER}>
              <div ref={frameScreenRef} data-lith="screen" style={FRAME_SCREEN}>
                <div
                  ref={emailInnerRef}
                  data-lith="scroll"
                  data-email-root
                  style={FRAME_SCROLL}
                >
                  {preview?.styleTexts.map((css, i) => (
                    <style key={i} dangerouslySetInnerHTML={{ __html: css }} />
                  ))}
                  <style
                    dangerouslySetInnerHTML={{
                      __html: stripDangerousCss(EMAIL_PREVIEW_OVERRIDE_CSS),
                    }}
                  />
                  <div
                    className={
                      preview?.bodyClass
                        ? `email-preview-body ${preview.bodyClass}`
                        : "email-preview-body"
                    }
                    style={{
                      width: "100%",
                      minHeight: "100%",
                      ...bodyStyleObj,
                    }}
                    dangerouslySetInnerHTML={
                      hasContent && preview
                        ? { __html: preview.bodyHtml }
                        : { __html: "" }
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
