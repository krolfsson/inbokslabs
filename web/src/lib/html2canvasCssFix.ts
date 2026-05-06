/**
 * html2canvas uses a CSS parser that errors on modern color functions (lab, lch, color(), …).
 * Strip/replace them in cloned CSS and inline styles before capture.
 */

function findMatchingCloseParen(s: string, openIdx: number): number {
  if (s[openIdx] !== "(") return -1;
  let depth = 1;
  for (let j = openIdx + 1; j < s.length; j++) {
    const c = s[j];
    if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0) return j;
    }
  }
  return -1;
}

/** Leftmost unsupported color function in the string (for nested replacements inner→outer). */
function findFirstUnsupportedColorFn(s: string): {
  start: number;
  openParen: number;
} | null {
  let bestIdx = Infinity;
  let best: { start: number; openParen: number } | null = null;

  const tryMatch = (re: RegExp) => {
    re.lastIndex = 0;
    const m = re.exec(s);
    if (m && m.index < bestIdx) {
      bestIdx = m.index;
      best = { start: m.index, openParen: m.index + m[0].length - 1 };
    }
  };

  tryMatch(/\b(?:lab|lch|oklch|oklab|hwb|color-mix|light-dark|device-cmyk)\s*\(/i);
  tryMatch(/\bcolor\s*\(/i);

  return best;
}

export function stripUnsupportedColorFunctions(css: string): string {
  let result = css;
  for (let iter = 0; iter < 500; iter++) {
    const pos = findFirstUnsupportedColorFn(result);
    if (!pos) break;
    const closeIdx = findMatchingCloseParen(result, pos.openParen);
    if (closeIdx < 0) break;
    result =
      result.slice(0, pos.start) +
      "rgb(128, 128, 128)" +
      result.slice(closeIdx + 1);
  }
  return result;
}

/**
 * Strip class from our capture chrome only (marked with data-lith) so parent
 * page Tailwind (oklch/lab) never hits html2canvas parser.
 */
export function stripLithCaptureClasses(doc: Document): void {
  doc.querySelectorAll("[data-lith]").forEach((el) => {
    el.removeAttribute("class");
  });
}

function removeNonEmailStyles(doc: Document): void {
  doc.querySelectorAll('link[rel="stylesheet"]').forEach((el) => el.remove());
  doc.querySelectorAll("style").forEach((node) => {
    if (!node.closest("[data-email-root]")) {
      node.remove();
    }
  });
}

function stripPaintAttributes(el: Element): void {
  for (const attr of ["fill", "stroke", "flood-color", "lighting-color"] as const) {
    const v = el.getAttribute(attr);
    if (v && /(?:lab|lch|oklch|oklab|color-mix|color\s*\(|hwb\s*\()/i.test(v)) {
      el.setAttribute(attr, stripUnsupportedColorFunctions(v));
    }
  }
}

export function sanitizeClonedDocumentForHtml2Canvas(doc: Document): void {
  stripLithCaptureClasses(doc);
  removeNonEmailStyles(doc);
  doc.querySelectorAll("style").forEach((node) => {
    const el = node as HTMLStyleElement;
    if (el.textContent) {
      el.textContent = stripUnsupportedColorFunctions(el.textContent);
    }
  });
  doc.querySelectorAll("[style]").forEach((el) => {
    const s = el.getAttribute("style");
    if (s) el.setAttribute("style", stripUnsupportedColorFunctions(s));
  });
  doc.querySelectorAll("svg, svg *").forEach((el) => stripPaintAttributes(el));
  doc.querySelectorAll("[bgcolor]").forEach((el) => {
    const s = el.getAttribute("bgcolor");
    if (s && /(?:lab|lch|oklch)/i.test(s)) {
      el.setAttribute("bgcolor", stripUnsupportedColorFunctions(s));
    }
  });
}
