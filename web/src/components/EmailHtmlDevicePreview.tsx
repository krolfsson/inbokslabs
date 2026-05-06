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
  borderRadius: 34,
  border: "8px solid #1c1c1e",
  backgroundColor: "#1c1c1e",
  boxShadow: "0 22px 58px -18px rgba(0,0,0,0.35)",
};

const FRAME_SCREEN: CSSProperties = {
  borderRadius: 26,
  overflow: "hidden",
  backgroundColor: "#ffffff",
};

const FRAME_SCROLL: CSSProperties = {
  overflow: "visible",
  overflowWrap: "anywhere",
  width: W,
  minWidth: 0,
  minHeight: 420,
  backgroundColor: "#ffffff",
  boxSizing: "border-box",
};

/**
 * Injected after campaign &lt;style&gt; blocks so it wins over mobile @media rules that set
 * footer td { display:block } when the browser viewport is narrow, and fixes CTA client shims.
 */
const EMAIL_PREVIEW_OVERRIDE_CSS = `
[data-email-root] .sf-links .set-txt {
  white-space: nowrap !important;
}
[data-email-root] .sf-links .set-txt a {
  display: inline-block !important;
  vertical-align: middle !important;
  white-space: nowrap !important;
}
[data-email-root] .sf-links .set-txt a img {
  display: inline-block !important;
  vertical-align: middle !important;
  width: 32px !important;
  max-width: 32px !important;
  height: 32px !important;
}
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
  [data-email-root] table.links-sm .set-txt,
  [data-email-root] table[class*="links-sm"] .set-txt {
    display: block !important;
    white-space: nowrap !important;
  }
  [data-email-root] table.links-sm a,
  [data-email-root] table[class*="links-sm"] a {
    display: inline-block !important;
    vertical-align: middle !important;
    white-space: nowrap !important;
  }
  [data-email-root] table.links-sm img,
  [data-email-root] table[class*="links-sm"] img,
  [data-email-root] .sf-links a img {
    display: inline-block !important;
    vertical-align: middle !important;
    width: 32px !important;
    max-width: 32px !important;
    height: 32px !important;
  }
  [data-email-root] .sf-links table.links-i td,
  [data-email-root] table.links-i td {
    display: table-cell !important;
  }
}
[data-email-root] .sf-cta table.cta-btn,
[data-email-root] .sf-cta table.cta-btn > tbody,
[data-email-root] .sf-cta table.cta-btn > tbody > tr,
[data-email-root] .sf-cta table.cta-btn > tbody > tr > td,
[data-email-root] .hero .sf-cta table.cta-btn > tbody > tr > td,
[data-email-root] .regular .sf-cta table.cta-btn > tbody > tr > td,
[data-email-root] .info .sf-cta table.cta-btn > tbody > tr > td,
[data-email-root] .highlight .sf-cta table.cta-btn > tbody > tr > td,
[data-email-root] .notice .sf-cta table.cta-btn > tbody > tr > td {
  border: 0 !important;
  border-width: 0 !important;
  border-style: none !important;
  border-color: transparent !important;
  outline: 0 !important;
  box-shadow: none !important;
}
[data-email-root] .sf-cta table.cta-btn > tbody > tr > td {
  overflow: hidden !important;
  box-sizing: border-box !important;
}
[data-email-root] .sf-cta table.cta-btn .fix-btn {
  overflow: hidden !important;
  border: 0 !important;
  outline: 0 !important;
  box-shadow: none !important;
}
[data-email-root] .sf-cta table.cta-btn a {
  box-sizing: border-box !important;
  padding-left: 24px !important;
  padding-right: 24px !important;
  border: 0 !important;
  outline: 0 !important;
  box-shadow: none !important;
}
[data-email-root] .sf-cta table.cta-btn a i {
  display: none !important;
  width: 0 !important;
  max-width: 0 !important;
  overflow: hidden !important;
  line-height: 0 !important;
  font-size: 0 !important;
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

const EMAIL_SCOPE = "[data-email-root]";
const EMAIL_BODY_SCOPE = `${EMAIL_SCOPE} .email-preview-body`;

function splitSelectorList(selectors: string): string[] {
  const out: string[] = [];
  let start = 0;
  let parens = 0;
  let brackets = 0;
  let quote: string | null = null;

  for (let i = 0; i < selectors.length; i++) {
    const c = selectors[i];
    if (quote) {
      if (c === quote && selectors[i - 1] !== "\\") quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (c === "(") parens++;
    else if (c === ")") parens = Math.max(0, parens - 1);
    else if (c === "[") brackets++;
    else if (c === "]") brackets = Math.max(0, brackets - 1);
    else if (c === "," && parens === 0 && brackets === 0) {
      out.push(selectors.slice(start, i).trim());
      start = i + 1;
    }
  }

  out.push(selectors.slice(start).trim());
  return out.filter(Boolean);
}

function prefixEmailSelector(selector: string): string {
  const s = selector.trim();
  if (!s) return s;
  if (s.startsWith(EMAIL_SCOPE)) return s;

  if (s === ":root" || s === "html" || s === "body" || s === "#acr-body") {
    return EMAIL_BODY_SCOPE;
  }

  const withoutDoc = s
    .replace(/^:root(?=$|[\s>+~.#[:])/i, EMAIL_SCOPE)
    .replace(/^html(?=$|[\s>+~.#[:])/i, EMAIL_SCOPE)
    .replace(/^body(?=$|[\s>+~.#[:])/i, EMAIL_BODY_SCOPE);

  if (withoutDoc !== s) return withoutDoc;
  return `${EMAIL_SCOPE} ${s}`;
}

function prefixEmailRuleSelectors(selectors: string): string {
  return splitSelectorList(selectors).map(prefixEmailSelector).join(", ");
}

function findRuleClose(css: string, openIdx: number): number {
  let depth = 1;
  let quote: string | null = null;

  for (let i = openIdx + 1; i < css.length; i++) {
    const c = css[i];
    if (quote) {
      if (c === quote && css[i - 1] !== "\\") quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function scopeEmailCss(css: string): string {
  let out = "";
  let i = 0;

  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open === -1) {
      out += css.slice(i);
      break;
    }

    const prelude = css.slice(i, open);
    const trimmedPrelude = prelude.trim();
    const close = findRuleClose(css, open);
    if (close === -1) {
      out += css.slice(i);
      break;
    }

    const inner = css.slice(open + 1, close);
    if (trimmedPrelude.startsWith("@")) {
      const atName = trimmedPrelude.match(/^@[\w-]+/)?.[0]?.toLowerCase();
      if (
        atName === "@media" ||
        atName === "@supports" ||
        atName === "@container" ||
        atName === "@layer"
      ) {
        out += `${prelude}{${scopeEmailCss(inner)}}`;
      } else {
        out += css.slice(i, close + 1);
      }
    } else {
      out += `${prefixEmailRuleSelectors(prelude)}{${inner}}`;
    }

    i = close + 1;
  }

  return out;
}

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
      const styleTexts = parsed.styleTexts.map((css) =>
        scopeEmailCss(stripDangerousCss(css)),
      );
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

      const h = Math.max(inner.scrollHeight, inner.clientHeight, 420);
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
          <div className="flex max-h-[min(74vh,880px)] justify-center overflow-auto p-2">
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
