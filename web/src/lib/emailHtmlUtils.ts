/** Parsed email for in-browser preview (must run in a browser — uses DOMParser). */
export type ParsedEmailPreview = {
  /** Concatenated CSS from &lt;style&gt; tags (head + body). */
  styleTexts: string[];
  /** Sanitize-ready body markup (body innerHTML, body &lt;style&gt; nodes stripped). */
  bodyHtml: string;
  /** Inline style from &lt;body&gt; for background etc. */
  bodyElementStyle?: string;
  /** HTML class on body. */
  bodyClass?: string;
};

/**
 * Strip risky patterns from CSS text (best-effort; pasted HTML is trusted for preview).
 */
export function stripDangerousCss(css: string): string {
  return css
    .replace(/\bexpression\s*\(/gi, "/*blocked*/(")
    .replace(/javascript\s*:/gi, "blocked:");
}

function isAbsoluteOrSpecialUrl(url: string): boolean {
  const u = url.trim();
  if (!u) return true;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return true;
  if (u.startsWith("data:") || u.startsWith("blob:") || u.startsWith("cid:"))
    return true;
  if (u.startsWith("//")) return true;
  return false;
}

function resolveSrcset(srcset: string, base: URL): string {
  return srcset
    .split(",")
    .map((piece) => {
      const part = piece.trim();
      const lastSpace = part.lastIndexOf(" ");
      const maybeDesc =
        lastSpace > 0 ? part.slice(lastSpace + 1).trim() : "";
      const hasDesc =
        /^\d+(\.\d+)?x$/i.test(maybeDesc) || /^\d+w$/i.test(maybeDesc);
      if (hasDesc && lastSpace > 0) {
        const urlPart = part.slice(0, lastSpace).trim();
        if (isAbsoluteOrSpecialUrl(urlPart)) return part;
        try {
          return `${new URL(urlPart, base).href} ${maybeDesc}`;
        } catch {
          return part;
        }
      }
      if (isAbsoluteOrSpecialUrl(part)) return part;
      try {
        return new URL(part, base).href;
      } catch {
        return part;
      }
    })
    .join(", ");
}

/**
 * Turn relative image/media URLs into absolute using a page or asset base (folder) URL.
 * Does not fix `cid:` (attachments) or blocked hosts — see UI copy.
 */
export function resolveRelativeAssetUrls(
  html: string,
  baseUrl: string,
): string {
  const h = html.trim();
  const b = baseUrl.trim();
  if (!h || !b || typeof window === "undefined") return html;

  let base: URL;
  try {
    const raw = b.includes("://") ? b : `https://${b}`;
    base = new URL(raw);
  } catch {
    return html;
  }

  const doc = new DOMParser().parseFromString(
    `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div class="lith-email-frag">${h}</div></body></html>`,
    "text/html",
  );
  const root = doc.querySelector(".lith-email-frag");
  if (!root) return html;

  const attrs = ["src", "poster", "data"] as const;

  const touch = (el: Element, attr: string) => {
    const v = el.getAttribute(attr);
    if (!v || isAbsoluteOrSpecialUrl(v)) return;
    try {
      el.setAttribute(attr, new URL(v, base).href);
    } catch {
      /* keep */
    }
  };

  root.querySelectorAll("img").forEach((el) => touch(el, "src"));
  root.querySelectorAll("source[src]").forEach((el) => touch(el, "src"));
  root.querySelectorAll("video[src], audio[src], embed[src]").forEach((el) =>
    touch(el, "src"),
  );
  root.querySelectorAll("iframe[src]").forEach((el) => touch(el, "src"));
  root.querySelectorAll("object[data]").forEach((el) => touch(el, "data"));

  root
    .querySelectorAll("img[srcset], source[srcset]")
    .forEach((el) => {
      const ss = el.getAttribute("srcset");
      if (!ss?.trim()) return;
      el.setAttribute("srcset", resolveSrcset(ss, base));
    });

  return root.innerHTML;
}

/**
 * Parse pasted HTML: extract &lt;style&gt; blocks and body inner HTML like a real client.
 * Fragments (no &lt;html&gt;) are wrapped so partial snippets still render.
 */
export function parseEmailForPreview(raw: string): ParsedEmailPreview {
  const t = raw.trim();
  if (!t) {
    return { styleTexts: [], bodyHtml: "" };
  }

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return { styleTexts: [], bodyHtml: t };
  }

  let source = t;
  const looksLikeFragment =
    !/<\s*html[\s>]/i.test(source) && !/<\s*body[\s>]/i.test(source);

  if (looksLikeFragment) {
    source = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${t}</body></html>`;
  }

  const doc = new DOMParser().parseFromString(source, "text/html");

  const styleTexts: string[] = [];
  doc.querySelectorAll("head style").forEach((el) => {
    const c = el.textContent?.trim();
    if (c) styleTexts.push(c);
  });

  doc.querySelectorAll("body style").forEach((el) => {
    const c = el.textContent?.trim();
    if (c) styleTexts.push(c);
    el.remove();
  });

  const body = doc.body;
  if (!body) {
    return { styleTexts, bodyHtml: t };
  }

  const bodyElementStyle = body.getAttribute("style") ?? undefined;
  const bodyClass = body.getAttribute("class") ?? undefined;

  return {
    styleTexts,
    bodyHtml: body.innerHTML,
    bodyElementStyle,
    bodyClass,
  };
}
