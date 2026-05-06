/**
 * html2canvas uses a CSS parser that errors on modern color functions (lab, lch, …).
 * Strip them in a string before/inside capture so export does not throw.
 */
export function stripUnsupportedColorFunctions(css: string): string {
  let result = css;
  while (true) {
    const m = /\b(?:lab|lch|oklch|oklab|color-mix|hwb)\(/i.exec(result);
    if (!m) break;
    const openIdx = m.index + m[0].length - 1;
    const closeIdx = findMatchingCloseParen(result, openIdx);
    if (closeIdx < 0) break;
    result =
      result.slice(0, m.index) +
      "rgb(128, 128, 128)" +
      result.slice(closeIdx + 1);
  }
  return result;
}

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

export function sanitizeClonedDocumentForHtml2Canvas(doc: Document): void {
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
}
