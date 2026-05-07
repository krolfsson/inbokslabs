/**
 * If the paste looks like a raw RFC message (.eml), extracts and decodes the
 * best body part (HTML preferred, plain text wrapped as &lt;pre&gt; otherwise).
 * Returns the input unchanged if it doesn't look like an email source.
 */
export function normalizeEmailHtmlInput(raw: string): string {
  const extracted = extractHtmlFromRawEmailSource(stripLeadingBom(raw).trim());
  return extracted ?? raw;
}

function stripLeadingBom(s: string): string {
  if (!s) return s;
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function stripLeadingMboxFrom(s: string): string {
  return s.replace(/^From\s[^\n]*\n/, "");
}

/** True when the string plausibly contains MIME headers + parts (not plain HTML). */
export function looksLikeRawEmailPaste(s: string): boolean {
  const t = stripLeadingMboxFrom(stripLeadingBom(s).trimStart());
  if (t.length < 40) return false;

  let score = 0;
  if (/^MIME-Version:\s/im.test(t)) score++;
  if (/^Content-Type:\s/im.test(t)) score += 2;
  if (/^Subject:\s/im.test(t)) score++;
  if (/^Received:\s/im.test(t)) score++;
  if (/^Return-Path:\s/im.test(t)) score++;
  if (/^Delivered-To:\s/im.test(t)) score++;
  if (/^Message-ID:\s/im.test(t)) score++;
  if (/^DKIM-Signature:\s/im.test(t)) score++;
  if (/^From:\s/im.test(t)) score++;
  if (/^To:\s/im.test(t)) score++;
  if (/^Date:\s/im.test(t)) score++;
  if (/--[^\n\r]+\r?\nContent-Type:/i.test(t)) score += 2;
  if (/boundary\s*=\s*["']?[^"'\s;]+/i.test(t)) score++;

  if (score >= 3) return true;

  /* Fallback: a top-level multipart Content-Type with boundary alone is a strong signal. */
  if (
    /^Content-Type:\s*multipart\/[a-z]+\s*;[\s\S]*?boundary\s*=/im.test(t)
  ) {
    return true;
  }

  return false;
}

function splitHeadersAndBody(raw: string): [string, string | undefined] {
  /* Normalize all flavors of newline (CRLF, lone CR) to LF before searching. */
  const n = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
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

type FoundParts = { html?: string; plain?: string };

function collectFromMultipart(
  mimeBody: string,
  contentTypeHeaderValue: string,
): FoundParts {
  const b = getBoundary(contentTypeHeaderValue);
  if (!b) return {};
  const subType =
    contentTypeHeaderValue.split(";")[0]?.trim().toLowerCase() ?? "";

  const subparts = parseMultipartParts(mimeBody, b);
  const result: FoundParts = {};
  const isAlternative = subType === "multipart/alternative";

  for (const sp of subparts) {
    const sub = collectFromPartTree(sp.body, sp.headers);
    if (sub.html) {
      /* multipart/alternative: keep the LAST (richest) — typically text/html;
         other multiparts (mixed/related): keep the FIRST. */
      if (isAlternative || !result.html) result.html = sub.html;
    }
    if (sub.plain) {
      if (isAlternative || !result.plain) result.plain = sub.plain;
    }
  }

  return result;
}

function collectFromPartTree(
  partBody: string,
  headers: Record<string, string>,
): FoundParts {
  const ctFull = headers["content-type"] || "";
  const mime = ctFull.split(";")[0]?.trim().toLowerCase() || "";

  if (mime.startsWith("multipart/")) {
    return collectFromMultipart(partBody, ctFull);
  }
  if (mime === "text/html" || mime === "application/xhtml+xml") {
    return { html: decodePartBody(partBody, headers) };
  }
  if (mime === "text/plain" || mime === "") {
    return { plain: decodePartBody(partBody, headers) };
  }
  return {};
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function plainTextToHtml(text: string): string {
  return `<pre style="white-space:pre-wrap;word-wrap:break-word;font:14px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;margin:0;padding:24px;background:#fff;">${escapeHtml(text)}</pre>`;
}

/**
 * Returns decoded body HTML from a raw RFC-5322 / MIME string. Prefers `text/html`,
 * but if only `text/plain` is present, wraps it as preformatted HTML so the
 * preview at least shows the text. Returns `null` for non-email pastes.
 */
export function extractHtmlFromRawEmailSource(raw: string): string | null {
  const cleaned = stripLeadingMboxFrom(stripLeadingBom(raw).trim());
  if (!cleaned || !looksLikeRawEmailPaste(cleaned)) return null;

  const [headerBlock, mimeBody] = splitHeadersAndBody(cleaned);
  if (mimeBody === undefined) return null;

  const topHeaders = parseHeaderBlock(headerBlock);
  const found = collectFromPartTree(mimeBody, topHeaders);

  if (found.html) return found.html;
  if (found.plain) return plainTextToHtml(found.plain);
  return null;
}

/**
 * Result of attempting to read an uploaded/dropped file as text.
 * - `text`: decoded text (UTF-8/16 BOMs and naive heuristics applied).
 * - `msg-binary`: an Outlook .msg / Compound File Binary (OLE) container — needs to
 *   be re-saved as .eml or HTML by the user.
 * - `unsupported`: file is empty or otherwise not decodable.
 */
export type EmailFileLoadResult =
  | { kind: "text"; text: string }
  | { kind: "msg-binary" }
  | { kind: "unsupported" };

const MS_CFB_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] as const;

function startsWithBytes(bytes: Uint8Array, prefix: readonly number[]): boolean {
  if (bytes.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (bytes[i] !== prefix[i]) return false;
  }
  return true;
}

/**
 * Decode an uploaded/dropped email file robustly.
 *
 * Why this is needed: the new Outlook on Windows often saves `.eml` as UTF-16 LE,
 * `FileReader.readAsText()` defaults to UTF-8 and silently produces null-padded
 * garbage. Some Outlook variants also produce real `.msg` (OLE) instead of `.eml`.
 */
export async function readEmailFileAsText(file: File): Promise<EmailFileLoadResult> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.length === 0) return { kind: "unsupported" };

  if (startsWithBytes(bytes, MS_CFB_MAGIC)) return { kind: "msg-binary" };

  /* Explicit BOM → trustworthy. */
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    return {
      kind: "text",
      text: new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(3)),
    };
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return {
      kind: "text",
      text: new TextDecoder("utf-16le").decode(bytes.subarray(2)),
    };
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return {
      kind: "text",
      text: new TextDecoder("utf-16be").decode(bytes.subarray(2)),
    };
  }

  /* Heuristic for UTF-16 without BOM: count nulls in the first 4 KB. */
  const sampleEnd = Math.min(4096, bytes.length);
  let evenNulls = 0;
  let oddNulls = 0;
  for (let i = 0; i < sampleEnd; i++) {
    if (bytes[i] === 0) {
      if (i % 2 === 0) evenNulls++;
      else oddNulls++;
    }
  }
  const nullRatio = (evenNulls + oddNulls) / Math.max(1, sampleEnd);
  if (nullRatio > 0.2) {
    const enc = oddNulls > evenNulls ? "utf-16le" : "utf-16be";
    return { kind: "text", text: new TextDecoder(enc).decode(bytes) };
  }

  return {
    kind: "text",
    text: new TextDecoder("utf-8", { fatal: false }).decode(bytes),
  };
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
