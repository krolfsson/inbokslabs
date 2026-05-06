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
import { LAYOUT } from "@/lib/inboxTypography";
import {
  parseEmailForPreview,
  resolveRelativeAssetUrls,
  stripDangerousCss,
} from "@/lib/emailHtmlUtils";
import { sanitizeClonedDocumentForHtml2Canvas } from "@/lib/html2canvasCssFix";

const W = LAYOUT.iphoneWidthPx;

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
    <section className={embedded ? "space-y-8" : "mt-12 space-y-8 border-t border-zinc-200 pt-12"}>
      {!embedded ? (
        <header className="max-w-2xl space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff5c47]">
            Full email
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
            HTML on iPhone (no status bar)
          </h2>
          <p className="text-sm text-zinc-600">
            Paste <strong>full HTML</strong> or a Gmail / Apple Mail{" "}
            <strong>&quot;raw source&quot;</strong> / .eml (headers + MIME parts); we pick{" "}
            <code className="rounded bg-zinc-100 px-1 text-[13px]">text/html</code>, decode quoted-printable/base64, then render.{" "}
            Images need a{" "}
            <strong>real URL</strong> the browser can load: <strong>relative</strong> paths (
            <code className="text-[13px]">/img.png</code>,{" "}
            <code className="text-[13px]">assets/x.jpg</code>) resolve against your site (
            <code className="text-[13px]">localhost</code>) and 404 unless you set{" "}
            <strong>asset base</strong> below. <code className="text-[13px]">cid:</code>{" "}
            attachments do not work in a web preview. <strong>HTTP</strong> images on an{" "}
            <strong>HTTPS</strong> page are blocked. PNG export still needs{" "}
            <strong>CORS</strong> on remote images to paint into the canvas.
          </p>
        </header>
      ) : (
        <p className="max-w-2xl text-[12px] leading-relaxed text-zinc-500">
          HTML or raw .eml (we extract <code className="rounded bg-zinc-100 px-1">text/html</code>).
          Full HTML + <code className="rounded bg-zinc-100 px-1">&lt;style&gt;</code> in head.
          Relative <code className="rounded bg-zinc-100 px-1">src</code> → set asset base.{" "}
          <code className="rounded bg-zinc-100 px-1">cid:</code> no. PNG needs CORS on images.
        </p>
      )}

      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Asset base URL (fixes relative images)
            </span>
            <input
              type="url"
              value={assetBaseUrl}
              onChange={(e) => setAssetBaseUrl(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-[#ff5c47]/40 focus:ring-2 focus:ring-[#ff5c47]/20"
              placeholder="https://your-cdn.com/path/to/email-folder/"
            />
            <p className="text-[11px] text-zinc-500">
              Use the folder your images live under, often with a trailing slash. Required
              if HTML uses relative <code className="font-mono text-[11px]">src=</code>{" "}
              paths.
            </p>
          </label>

          <label className="block space-y-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Email HTML
            </span>
            <textarea
              value={rawHtml}
              onChange={(e) => setRawHtml(e.target.value)}
              spellCheck={false}
              className="textarea-email-html h-[min(320px,42vh)] w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-[13px] leading-relaxed text-zinc-800 shadow-sm outline-none focus:border-[#ff5c47]/40 focus:ring-2 focus:ring-[#ff5c47]/20"
              placeholder="Full HTML, body only, or raw message source (.eml) with headers…"
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
            {W}px wide ·&nbsp;
            {preview?.styleTexts.length
              ? `${preview.styleTexts.length} &lt;style&gt; block(s) applied`
              : "no document styles (fragment only)"}
            {" "}
            · scroll sideways for 600px layouts
          </p>
          <div className="flex max-h-[min(78vh,880px)] justify-center overflow-auto pb-2">
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
