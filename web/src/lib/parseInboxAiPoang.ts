/** First line format from /api/inbox-ai: POÄNG: 0–100 */

export type ParsedPoangSplit = {
  score: number | null;
  /** Text after POÄNG line (may be incomplete while streaming). */
  analysis: string;
  /** True once a newline separates body from header line */
  parsedHeader: boolean;
};

function clampPct(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

export function parseInboxAiPoang(full: string): ParsedPoangSplit {
  const idx = full.indexOf("\n");
  if (idx === -1) {
    const one = full.trim();
    const m = one.match(/^POÄNG:\s*(\d{1,3})\s*$/i);
    if (m)
      return {
        score: clampPct(Number.parseInt(m[1], 10)),
        analysis: "",
        parsedHeader: true,
      };
    return { score: null, analysis: "", parsedHeader: false };
  }

  const first = full.slice(0, idx).trim();
  const rest = full.slice(idx + 1);
  const m = first.match(/^POÄNG:\s*(\d{1,3})\s*$/i);
  if (m)
    return {
      score: clampPct(Number.parseInt(m[1], 10)),
      analysis: rest,
      parsedHeader: true,
    };
  /* Model failed format — expose full stream as readable analysis fallback */
  return { score: null, analysis: full, parsedHeader: true };
}

export function bandFromPercent(p: number): "low" | "medium" | "high" {
  if (p >= 72) return "high";
  if (p >= 45) return "medium";
  return "low";
}
