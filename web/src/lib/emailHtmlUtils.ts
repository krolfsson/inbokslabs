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
