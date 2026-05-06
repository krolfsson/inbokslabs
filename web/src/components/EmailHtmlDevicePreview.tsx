"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";
import { toPng } from "html-to-image";
import {
  normalizeEmailHtmlInput,
  parseEmailForPreview,
  resolveRelativeAssetUrls,
  stripDangerousCss,
} from "@/lib/emailHtmlUtils";
import { DataHandlingNote } from "@/components/DataHandlingNote";
import { SLIDE_MS, SLIDE_TIMING_CSS } from "@/components/SlidingSegment";

const WIDTH_CHIP_PRESETS = [600, 640, 700, 800] as const;

/** Default full-email artboard width (px). Inbox mockups stay at 390px device width. */
const DEFAULT_PREVIEW_WIDTH = 600;
const PREVIEW_WIDTH_MIN = 280;
const PREVIEW_WIDTH_MAX = 1200;

const EXPORT_SCALE = 3;
/** För AI vision — lägre pixel­ratio minskar payload men räcker för att se knappar/länkar. */
const VISION_CAPTURE_PIXEL_RATIO = 2;

/**
 * html-to-image har en modul­cache för inbäddade resurser. Nyckeln ignorerar query som standard,
 * så alla våra `/api/image?url=…` råkade dela samma cache — export fick samma bitmap överallt.
 * `includeQueryParams` + `no-store` + `cacheBust` gör varje distinkt bild-URL och varje export färsk.
 */
const HTML_TO_IMAGE_FETCH = {
  cacheBust: true as const,
  includeQueryParams: true as const,
  fetchRequestInit: { cache: "no-store" as const },
};

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

/** No Tailwind on capture subtree — TW4 uses oklch/lab; DOM export stays isolated from app CSS. */
const FRAME_OUTER: CSSProperties = {
  display: "inline-block",
  borderRadius: 28,
  backgroundColor: "#ffffff",
  boxShadow: "none",
  border: "1px solid rgba(0,0,0,0.08)",
  overflow: "hidden",
};

const FRAME_SCREEN: CSSProperties = {
  borderRadius: 28,
  overflow: "hidden",
  backgroundColor: "#ffffff",
};

const FRAME_SCROLL_BASE: CSSProperties = {
  overflow: "visible",
  overflowWrap: "anywhere",
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

/** Default för tom arbetsyta och obunden förhandskomponent (kan styras externt). */
export const DEFAULT_EMAIL_PREVIEW_HTML = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <tr><td style="padding:24px 20px 12px;font-size:22px;font-weight:600;color:#111">Rubrik</td></tr>
  <tr><td style="padding:0 20px 16px;font-size:15px;line-height:1.45;color:#444">Brödtext</td></tr>
  <tr><td style="padding:0 20px 24px;"><a href="#" style="display:inline-block;background:#ff5c47;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:999px;font-size:15px;">Knapp</a></td></tr>
  <tr><td style="padding:16px 20px;border-top:1px solid #eee;font-size:12px;color:#888">Sidfot</td></tr>
</table>`;

const CTA_AI_DEBOUNCE_MS = 680;

function collapseWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Tom om användaren inte ändrat bort appens skelett eller klistrat in .eml/html. */
function resolvedHtmlForCtaAi(raw: string, defaultSkeleton: string): string {
  const n = normalizeEmailHtmlInput(raw).trim();
  if (!n) return "";
  if (collapseWs(n) === collapseWs(defaultSkeleton)) return "";
  return normalizeEmailHtmlInput(raw);
}

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

function proxiedAssetUrl(src: string): string {
  const trimmed = src.trim();
  if (!/^https?:\/\//i.test(trimmed)) return src;
  if (typeof window !== "undefined") {
    try {
      const u = new URL(trimmed);
      if (u.origin === window.location.origin && u.pathname === "/api/image") {
        return src;
      }
    } catch {
      return src;
    }
  }
  return `/api/image?url=${encodeURIComponent(trimmed)}`;
}

function proxySrcset(srcset: string): string {
  return srcset
    .split(",")
    .map((piece) => {
      const part = piece.trim();
      const lastSpace = part.lastIndexOf(" ");
      const descriptor = lastSpace > 0 ? part.slice(lastSpace + 1).trim() : "";
      const hasDescriptor =
        /^\d+(\.\d+)?x$/i.test(descriptor) || /^\d+w$/i.test(descriptor);
      if (!hasDescriptor) return proxiedAssetUrl(part);
      return `${proxiedAssetUrl(part.slice(0, lastSpace).trim())} ${descriptor}`;
    })
    .join(", ");
}

function proxyRemoteImages(html: string): string {
  if (!html.trim() || typeof DOMParser === "undefined") return html;

  const doc = new DOMParser().parseFromString(
    `<!DOCTYPE html><html><body><div data-proxy-root>${html}</div></body></html>`,
    "text/html",
  );
  const root = doc.querySelector("[data-proxy-root]");
  if (!root) return html;

  root.querySelectorAll("img[src]").forEach((img) => {
    const src = img.getAttribute("src");
    if (src) img.setAttribute("src", proxiedAssetUrl(src));
  });
  root.querySelectorAll("source[src]").forEach((source) => {
    const src = source.getAttribute("src");
    if (src) source.setAttribute("src", proxiedAssetUrl(src));
  });
  root.querySelectorAll("img[srcset], source[srcset]").forEach((el) => {
    const srcset = el.getAttribute("srcset");
    if (srcset) el.setAttribute("srcset", proxySrcset(srcset));
  });

  return root.innerHTML;
}

export function EmailHtmlDevicePreview({
  embedded = false,
}: {
  embedded?: boolean;
} = {}) {
  const [rawHtml, setRawHtml] = useState(DEFAULT_EMAIL_PREVIEW_HTML);

  const [ctaText, setCtaText] = useState("");
  const [ctaBusy, setCtaBusy] = useState(false);
  const [ctaErr, setCtaErr] = useState<string | null>(null);
  const [ctaNoKey, setCtaNoKey] = useState(false);

  /** Folder or origin where relative <img src> paths resolve (e.g. https://cdn.example.com/campaign/). */
  const [assetBaseUrl, setAssetBaseUrl] = useState("");
  const [previewWidth, setPreviewWidth] = useState(DEFAULT_PREVIEW_WIDTH);
  /** Draft so multi-digit widths (e.g. 700) can be typed without per-keystroke clamping. */
  const [previewWidthDraft, setPreviewWidthDraft] = useState(
    String(DEFAULT_PREVIEW_WIDTH),
  );
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const captureRootRef = useRef<HTMLDivElement>(null);
  const frameScreenRef = useRef<HTMLDivElement>(null);
  const emailInnerRef = useRef<HTMLDivElement>(null);
  const widthChipWrapRef = useRef<HTMLDivElement>(null);
  const widthChipBtnRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [widthPillGeom, setWidthPillGeom] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    setPreviewWidthDraft(String(previewWidth));
  }, [previewWidth]);

  useLayoutEffect(() => {
    const wrap = widthChipWrapRef.current;
    const idx = WIDTH_CHIP_PRESETS.indexOf(
      previewWidth as (typeof WIDTH_CHIP_PRESETS)[number],
    );
    if (!wrap || idx < 0) {
      setWidthPillGeom(null);
      return;
    }
    const btn = widthChipBtnRefs.current[idx];
    if (!btn) {
      setWidthPillGeom(null);
      return;
    }
    const wr = wrap.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    setWidthPillGeom({
      left: br.left - wr.left,
      top: br.top - wr.top,
      width: br.width,
      height: br.height,
    });
  }, [previewWidth]);

  useEffect(() => {
    let cancelled = false;
    void import("dompurify").then(({ default: DOMPurify }) => {
      const parsed = parseEmailForPreview(rawHtml);
      const withUrls = resolveRelativeAssetUrls(
        parsed.bodyHtml,
        assetBaseUrl,
      );
      const cleanBody = DOMPurify.sanitize(
        proxyRemoteImages(withUrls),
        PURIFY_BODY,
      );
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

  const ctaAiPayload = useMemo(
    () => resolvedHtmlForCtaAi(rawHtml, DEFAULT_EMAIL_PREVIEW_HTML),
    [rawHtml],
  );

  const frameScrollStyle = useMemo(
    (): CSSProperties => ({
      ...FRAME_SCROLL_BASE,
      width: previewWidth,
    }),
    [previewWidth],
  );

  const clampPreviewWidth = (value: number) =>
    Math.min(PREVIEW_WIDTH_MAX, Math.max(PREVIEW_WIDTH_MIN, value));

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

  const createExportClone = (source: HTMLElement) => {
    const host = document.createElement("div");
    host.setAttribute("data-export-host", "true");
    host.style.position = "fixed";
    host.style.left = "-100000px";
    host.style.top = "0";
    host.style.zIndex = "-1";
    host.style.background = "transparent";
    host.style.pointerEvents = "none";
    host.style.width = `${source.scrollWidth}px`;

    const clone = source.cloneNode(true) as HTMLElement;
    clone.style.boxShadow = "none";

    const clonedScreen = clone.querySelector<HTMLElement>('[data-lith="screen"]');
    const clonedEmail = clone.querySelector<HTMLElement>('[data-lith="scroll"]');

    if (clonedScreen) {
      clonedScreen.style.overflow = "hidden";
      clonedScreen.style.height = "auto";
      clonedScreen.style.maxHeight = "none";
    }

    if (clonedEmail) {
      clonedEmail.style.height = "auto";
      clonedEmail.style.minHeight = `${Math.max(
        emailInnerRef.current?.scrollHeight ?? 0,
        420,
      )}px`;
      clonedEmail.style.maxHeight = "none";
      clonedEmail.style.overflow = "visible";
      clonedEmail.style.overflowX = "visible";
      clonedEmail.style.overflowY = "visible";
    }

    host.appendChild(clone);
    document.body.appendChild(host);
    return { host, clone };
  };

  const savePng = useCallback(async () => {
    const root = captureRootRef.current;
    const inner = emailInnerRef.current;
    if (!root || !inner || !hasContent) return;

    setExporting(true);
    setExportError(null);

    let exportHost: HTMLDivElement | null = null;

    try {
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

      const { host, clone } = createExportClone(root);
      exportHost = host;

      await flushLayout();
      await waitForImages(clone);
      await flushLayout();

      const exportWidth = Math.max(clone.scrollWidth, clone.offsetWidth);
      const exportHeight = Math.max(clone.scrollHeight, clone.offsetHeight);

      const dataUrl = await toPng(clone, {
        ...HTML_TO_IMAGE_FETCH,
        pixelRatio: EXPORT_SCALE,
        width: exportWidth,
        height: exportHeight,
        backgroundColor: "#ffffff",
        style: {
          margin: "0",
          transform: "none",
        },
      });

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `inbokslabs-epost-${Date.now()}.png`;
      a.click();
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "PNG-export misslyckades.";
      setExportError(msg);
    } finally {
      exportHost?.remove();
      setExporting(false);
    }
  }, [hasContent]);

  const capturePreviewForVisionAi = useCallback(async (): Promise<string | null> => {
    const root = captureRootRef.current;
    const inner = emailInnerRef.current;
    if (!root || !inner || !hasContent) return null;

    let exportHost: HTMLDivElement | null = null;
    try {
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

      const { host, clone } = createExportClone(root);
      exportHost = host;

      await flushLayout();
      await waitForImages(clone);
      await flushLayout();

      const exportWidth = Math.max(clone.scrollWidth, clone.offsetWidth);
      const exportHeight = Math.max(clone.scrollHeight, clone.offsetHeight);

      return await toPng(clone, {
        ...HTML_TO_IMAGE_FETCH,
        pixelRatio: VISION_CAPTURE_PIXEL_RATIO,
        width: exportWidth,
        height: exportHeight,
        backgroundColor: "#ffffff",
        style: {
          margin: "0",
          transform: "none",
        },
      });
    } catch {
      return null;
    } finally {
      exportHost?.remove();
    }
  }, [hasContent]);

  useEffect(() => {
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      if (!ctaAiPayload) {
        setCtaText("");
        setCtaErr(null);
        setCtaBusy(false);
        setCtaNoKey(false);
        return;
      }

      void (async () => {
        setCtaBusy(true);
        setCtaErr(null);
        setCtaNoKey(false);
        setCtaText("");
        try {
          let screenshotDataUrl: string | null = null;
          if (hasContent) {
            screenshotDataUrl = await capturePreviewForVisionAi();
          }
          if (ac.signal.aborted) return;

          const payload: { html: string; screenshotDataUrl?: string } = {
            html: ctaAiPayload,
          };
          if (screenshotDataUrl?.startsWith("data:image/")) {
            payload.screenshotDataUrl = screenshotDataUrl;
          }

          const res = await fetch("/api/email-cta-ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: ac.signal,
          });

          if (res.status === 503) {
            let code = "";
            try {
              const j = (await res.json()) as { error?: string };
              code = j.error ?? "";
            } catch {
              /* ignore */
            }
            if (code === "NO_KEY") {
              setCtaNoKey(true);
              return;
            }
            setCtaErr("CTA‑analys är inte konfigurerad just nu.");
            return;
          }

          if (res.status === 400) {
            setCtaErr("Innehåll saknas eller kunde inte tolkas.");
            return;
          }

          if (res.status === 413) {
            setCtaErr("Skärmbilden blev för stor — prova ett kortare utkast eller smalare bredd.");
            return;
          }

          if (!res.ok) {
            setCtaErr("Kunde inte hämta CTA‑analys.");
            return;
          }

          const reader = res.body?.getReader();
          if (!reader) {
            setCtaErr("Saknar svar från servern.");
            return;
          }

          const dec = new TextDecoder();
          while (!ac.signal.aborted) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = dec.decode(value, { stream: true });
            if (chunk) setCtaText((prev) => prev + chunk);
          }
        } catch (e) {
          if (ac.signal.aborted) return;
          const name =
            e && typeof e === "object" && "name" in e
              ? String((e as Error).name)
              : "";
          if (name === "AbortError") return;
          setCtaErr(e instanceof Error ? e.message : "Något gick fel.");
        } finally {
          if (!ac.signal.aborted) setCtaBusy(false);
        }
      })();
    }, CTA_AI_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [ctaAiPayload, hasContent, capturePreviewForVisionAi]);

  const commitPreviewWidth = () => {
    const n = Number.parseInt(previewWidthDraft.trim(), 10);
    if (!Number.isFinite(n)) {
      setPreviewWidthDraft(String(previewWidth));
      return;
    }
    const clamped = clampPreviewWidth(n);
    setPreviewWidth(clamped);
    setPreviewWidthDraft(String(clamped));
  };

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
        <div className="rounded-[30px] border border-brand/10 bg-brand-tint/55 p-5 shadow-[inset_0_0_0_1px_rgba(79,70,229,0.06)]">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-[-0.035em] text-brand">
              E-postförhandsvisning
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Klistra in HTML eller ett rått e-postmeddelande (t.ex. .eml-källa).
            </p>
            <div className="mt-4">
              <DataHandlingNote variant="email-html" />
            </div>
          </div>

          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-medium text-brand-deep/85">
                E-post
              </span>
              <textarea
                value={rawHtml}
                onChange={(e) => setRawHtml(e.target.value)}
                spellCheck={false}
                className="textarea-email-html h-[min(430px,54vh)] w-full resize-none rounded-2xl border border-brand/10 bg-white/90 px-4 py-3 font-mono text-[12px] leading-relaxed text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-brand/35 focus:bg-white focus:shadow-[0_0_0_4px_rgba(79,70,229,0.10)]"
                placeholder="Klistra in HTML eller källtext från .eml…"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-medium text-brand-deep/85">
                Bas-URL för bilder
              </span>
              <input
                type="url"
                value={assetBaseUrl}
                onChange={(e) => setAssetBaseUrl(e.target.value)}
                className="w-full rounded-2xl border border-brand/10 bg-white/90 px-4 py-3 text-[15px] text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-brand/35 focus:bg-white focus:shadow-[0_0_0_4px_rgba(79,70,229,0.10)]"
                placeholder="Valfritt (t.ex. CDN)"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-brand/20 bg-white px-5 text-sm font-semibold text-brand shadow-sm transition hover:border-brand/40 hover:bg-brand-tint/40">
                <input
                  type="file"
                  accept=".html,.htm,.eml,text/html,.txt"
                  className="sr-only"
                  onChange={onFile}
                />
                Ladda upp
              </label>
              <button
                type="button"
                disabled={!hasContent || exporting}
                onClick={savePng}
                className="inline-flex h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-[0_2px_14px_rgba(79,70,229,0.28)] transition hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-40"
              >
                {exporting ? "Sparar…" : "Spara PNG"}
              </button>
            </div>
            {exportError ? (
              <p className="text-sm text-red-600" role="alert">
                {exportError}
              </p>
            ) : null}

            <div
              className="rounded-2xl border border-brand/15 bg-white/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]"
              aria-live="polite"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold tracking-tight text-brand-deep">
                  CTA‑analys (AI)
                </h3>
                {ctaBusy ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
                    <span className="size-1.5 animate-pulse rounded-full bg-zinc-400" />
                    Analyserar…
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-[11px] leading-snug text-zinc-500">
                Efter en kort paus tas en{" "}
                <strong>skärmdump av förhands­visningen</strong>
                {" "}(samma vy som till höger) och skickas till AI tillsammans med trunkerad HTML/.eml, så
                modellen ser knapp­utseende som du gör; analysen lägger tyngdpunkt på{" "}
                <strong>CTA‑copy</strong> (vad som står på knappen eller länken). Inkorgs­fliken
                påverkas inte.
              </p>
              {ctaNoKey ? (
                <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2.5 text-[12px] leading-snug text-zinc-600">
                  För AI här krävs{" "}
                  <code className="rounded bg-zinc-200/80 px-1 py-0.5 text-[11px]">
                    OPENAI_API_KEY
                  </code>{" "}
                  i <code className="rounded bg-zinc-200/80 px-1 py-0.5 text-[11px]">
                    web/.env.local
                  </code>
                  eller i miljön på deploy.
                </p>
              ) : null}
              {ctaErr && !ctaNoKey ? (
                <p className="mt-3 text-[12px] text-rose-600" role="alert">
                  {ctaErr}
                </p>
              ) : null}
              <div className="mt-3 min-h-[2rem] whitespace-pre-wrap text-[12px] leading-relaxed text-zinc-700">
                {!ctaAiPayload && !ctaBusy && !ctaErr ? (
                  <span className="text-zinc-400">
                    Lägg in e-post utöver standard­skelettet eller importera fil för analys.
                  </span>
                ) : null}
                {ctaBusy &&
                ctaAiPayload &&
                ctaText.length === 0 &&
                !ctaErr &&
                !ctaNoKey ? (
                  <span className="text-zinc-500">Ansluter till modellen…</span>
                ) : null}
                {ctaText.trim() !== "" ? ctaText.trim() : null}
                {ctaBusy && ctaText.length > 0 ? (
                  <span
                    className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-zinc-400 align-middle"
                    aria-hidden
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 rounded-[30px] border border-brand/10 bg-brand-tint/55 p-4 shadow-[inset_0_0_0_1px_rgba(79,70,229,0.06)] sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold tracking-tight text-brand">
              Förhandsvisning
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-zinc-600">
                <span className="font-medium">Bredd</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={PREVIEW_WIDTH_MIN}
                  max={PREVIEW_WIDTH_MAX}
                  step={1}
                  value={previewWidthDraft}
                  onChange={(e) => setPreviewWidthDraft(e.target.value)}
                  onBlur={commitPreviewWidth}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                    }
                  }}
                  className="w-[4.5rem] rounded-xl border border-brand/15 bg-white px-2 py-1.5 text-right text-sm font-medium tabular-nums text-zinc-900 outline-none transition focus:border-brand/35 focus:bg-white"
                />
                <span className="text-zinc-400">px</span>
              </label>
              <div className="hidden h-4 w-px bg-brand/15 sm:block" aria-hidden />
              <div
                ref={widthChipWrapRef}
                className="relative inline-flex flex-wrap gap-1 rounded-full bg-brand-tint/50 p-1"
              >
                {widthPillGeom ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute z-0 rounded-full bg-brand shadow-sm"
                    style={{
                      left: widthPillGeom.left,
                      top: widthPillGeom.top,
                      width: widthPillGeom.width,
                      height: widthPillGeom.height,
                      transition: `left ${SLIDE_MS}ms ${SLIDE_TIMING_CSS}, top ${SLIDE_MS}ms ${SLIDE_TIMING_CSS}, width ${SLIDE_MS}ms ${SLIDE_TIMING_CSS}, height ${SLIDE_MS}ms ${SLIDE_TIMING_CSS}`,
                    }}
                  />
                ) : null}
                {WIDTH_CHIP_PRESETS.map((w, i) => (
                  <button
                    key={w}
                    ref={(el) => {
                      widthChipBtnRefs.current[i] = el;
                    }}
                    type="button"
                    onClick={() => setPreviewWidth(w)}
                    className={`relative z-[1] rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors duration-300 ${
                      previewWidth === w
                        ? "text-white"
                        : "text-zinc-700 hover:text-brand-deep"
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-center overflow-x-auto p-2">
            <div ref={captureRootRef} data-lith="frame" style={FRAME_OUTER}>
              <div ref={frameScreenRef} data-lith="screen" style={FRAME_SCREEN}>
                <div
                  ref={emailInnerRef}
                  data-lith="scroll"
                  data-email-root
                  style={frameScrollStyle}
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
