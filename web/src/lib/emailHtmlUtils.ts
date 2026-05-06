/**
 * If the paste looks like a raw RFC message (.eml), extracts and decodes the
 * best `text/html` part; otherwise returns the input unchanged.
 */
export function normalizeEmailHtmlInput(raw: string): string {
  const extracted = extractHtmlFromRawEmailSource(raw.trim());
  return extracted ?? raw;
}

/** True when the string plausibly contains MIME headers + parts (not plain HTML). */
export function looksLikeRawEmailPaste(s: string): boolean {
  const t = s.trimStart();
  if (t.length < 120) return false;

  let score = 0;
  if (/^MIME-Version:\s/im.test(t)) score++;
  if (/^Content-Type:\s/im.test(t)) score++;
  if (/^Subject:\s/im.test(t)) score++;
  if (/^Received:\s/im.test(t)) score++;
  if (/^Return-Path:\s/im.test(t)) score++;
  if (/^Delivered-To:\s/im.test(t)) score++;
  if (/^Message-ID:\s/im.test(t)) score++;
  if (/^DKIM-Signature:\s/im.test(t)) score++;
  if (/--[^\n\r]+\r?\nContent-Type:/i.test(t)) score += 2;
  if (/boundary\s*=\s*["']?[^"'\s;]+/i.test(t)) score++;

  return score >= 3;
}

function splitHeadersAndBody(raw: string): [string, string | undefined] {
  const n = raw.replace(/\r\n/g, "\n");
  const idx = n.search(/\n\n/);
  if (idx === -1) return [n, undefined];
  return [n.slice(0, idx), n.slice(idx + 2)];
}

function parseHeaderBlock(block: string): Record<string, string> {
  const lines = block.replace(/\r\n/g, "\n").split("\n");
  const out: Record<string, string> = {};
  let curKey = "";
  let curVal = "";
  for (const line of lines) {
    if (!line.trim()) continue;
    if (/^[ \t]/.test(line) && curKey) {
      curVal += " " + line.trim();
    } else {
      if (curKey) out[curKey.toLowerCase()] = curVal.trim();
      const idx = line.indexOf(":");
      if (idx === -1) {
        curKey = "";
        curVal = "";
        continue;
      }
      curKey = line.slice(0, idx).trim();
      curVal = line.slice(idx + 1).trim();
    }
  }
  if (curKey) out[curKey.toLowerCase()] = curVal.trim();
  return out;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getMimeParam(headerValue: string, param: string): string | undefined {
  const re = new RegExp(
    `(?:^|;)\\s*${escapeRegExp(param)}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^;\\s]+))`,
    "i",
  );
  const m = headerValue.match(re);
  if (!m) return undefined;
  return (m[1] ?? m[2] ?? m[3])?.trim();
}

function getCharset(contentType: string): string {
  return (
    getMimeParam(contentType, "charset")?.replace(/^"|"$/g, "") || "utf-8"
  );
}

function decodeWithCharset(bytes: Uint8Array, charset: string): string {
  const enc = charset.toLowerCase().replace(/^"|"$/g, "");
  try {
    return new TextDecoder(enc, { fatal: false }).decode(bytes);
  } catch {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }
}

function decodeQuotedPrintableBody(body: string, charset: string): string {
  const flat = body.replace(/=\r?\n/g, "");
  const bytes: number[] = [];
  for (let i = 0; i < flat.length; i++) {
    if (
      flat[i] === "=" &&
      i + 2 < flat.length &&
      /^[0-9A-Fa-f]{2}$/.test(flat.slice(i + 1, i + 3))
    ) {
      bytes.push(parseInt(flat.slice(i + 1, i + 3), 16));
      i += 2;
      continue;
    }
    const c = flat.charCodeAt(i);
    if (c < 128) bytes.push(c);
    else {
      for (const b of new TextEncoder().encode(flat[i])) bytes.push(b);
    }
  }
  return decodeWithCharset(new Uint8Array(bytes), charset);
}

function decodeBase64Body(body: string, charset: string): string {
  const cleaned = body.replace(/\s+/g, "");
  if (typeof atob === "undefined") return body;
  try {
    const binary = atob(cleaned);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return decodeWithCharset(bytes, charset);
  } catch {
    return body;
  }
}

function decodePartBody(partBody: string, headers: Record<string, string>) {
  const cte = (
    headers["content-transfer-encoding"] || "7bit"
  ).toLowerCase().trim();
  const ct = headers["content-type"] || "";
  const charset = getCharset(ct);

  if (cte.includes("base64")) {
    return decodeBase64Body(partBody, charset);
  }
  if (cte.includes("quoted-printable")) {
    return decodeQuotedPrintableBody(partBody, charset);
  }
  return partBody;
}

/**
 * Split a MIME multipart body into parts (each: headers + raw body string).
 */
function parseMultipartParts(
  body: string,
  boundary: string,
): Array<{ headers: Record<string, string>; body: string }> {
  const parts: Array<{ headers: Record<string, string>; body: string }> = [];
  const b = boundary.trim();
  const nb = `--${b}`;
  const endNb = `${nb}--`;

  let p = 0;
  while (true) {
    const start = body.indexOf(nb, p);
    if (start === -1) break;
    if (body.startsWith(endNb, start)) break;

    let pos = start + nb.length;
    if (body.startsWith("\r\n", pos)) pos += 2;
    else if (body[pos] === "\n") pos += 1;

    const heCrlf = body.indexOf("\r\n\r\n", pos);
    const heLf = body.indexOf("\n\n", pos);
    let he: number;
    let sepLen: number;
    if (heCrlf !== -1 && (heLf === -1 || heCrlf <= heLf)) {
      he = heCrlf;
      sepLen = 4;
    } else if (heLf !== -1) {
      he = heLf;
      sepLen = 2;
    } else break;

    const headerText = body.slice(pos, he);
    const bi = he + sepLen;

    let end = body.length;
    const nextDelim = body.indexOf(nb, bi);
    const endAll = body.indexOf(endNb, bi);
    if (nextDelim !== -1) end = nextDelim;
    if (endAll !== -1) end = Math.min(end, endAll);

    const rawPart = body.slice(bi, end).replace(/\s+$/, "");

    parts.push({ headers: parseHeaderBlock(headerText), body: rawPart });

    if (nextDelim === -1) break;
    p = nextDelim;
  }

  return parts;
}

function getBoundary(contentTypeValue: string): string | undefined {
  return getMimeParam(contentTypeValue, "boundary");
}

function extractHtmlFromMultipart(
  mimeBody: string,
  contentTypeHeaderValue: string,
): string | null {
  const b = getBoundary(contentTypeHeaderValue);
  if (!b) return null;
  const subType = contentTypeHeaderValue
    .split(";")[0]
    ?.trim()
    .toLowerCase();

  const subparts = parseMultipartParts(mimeBody, b);

  if (subType === "multipart/alternative") {
    let lastHtml: string | null = null;
    for (const sp of subparts) {
      const mime = (sp.headers["content-type"] || "")
        .split(";")[0]
        ?.trim()
        .toLowerCase();
      if (mime === "text/html" || mime === "application/xhtml+xml") {
        const inner = extractHtmlFromPartTree(sp.body, sp.headers);
        if (inner) lastHtml = inner;
      }
    }
    return lastHtml;
  }

  for (const sp of subparts) {
    const inner = extractHtmlFromPartTree(sp.body, sp.headers);
    if (inner) return inner;
  }
  return null;
}

function extractHtmlFromPartTree(
  partBody: string,
  headers: Record<string, string>,
): string | null {
  const ctFull = headers["content-type"] || "";
  const mime = ctFull.split(";")[0]?.trim().toLowerCase() || "";

  if (mime.startsWith("multipart/")) {
    return extractHtmlFromMultipart(partBody, ctFull);
  }
  if (mime === "text/html" || mime === "application/xhtml+xml") {
    return decodePartBody(partBody, headers);
  }
  return null;
}

/**
 * Returns decoded `text/html` from a raw RFC-5322 / MIME string, or `null`.
 */
export function extractHtmlFromRawEmailSource(raw: string): string | null {
  const t = raw.trim();
  if (!t || !looksLikeRawEmailPaste(t)) return null;

  const [headerBlock, mimeBody] = splitHeadersAndBody(t);
  if (mimeBody === undefined) return null;

  const topHeaders = parseHeaderBlock(headerBlock);
  const topCt = topHeaders["content-type"] || "";

  if (topCt.toLowerCase().includes("multipart/")) {
    return extractHtmlFromMultipart(mimeBody, topCt);
  }

  const mime = topCt.split(";")[0]?.trim().toLowerCase() || "";
  if (mime === "text/html" || mime === "application/xhtml+xml") {
    return decodePartBody(mimeBody, topHeaders);
  }

  return null;
}

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
  const t = normalizeEmailHtmlInput(raw).trim();
  if (!t) {
    return { styleTexts: [], bodyHtml: "" };
  }

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return { styleTexts: [], bodyHtml: t };
  }

  const looksLikeFragment =
    !/<\s*html[\s>]/i.test(t) && !/<\s*body[\s>]/i.test(t);

  const source = looksLikeFragment
    ? `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${t}</body></html>`
    : t;

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
