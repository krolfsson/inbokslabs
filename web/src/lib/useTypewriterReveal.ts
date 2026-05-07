"use client";

import { useEffect, useState } from "react";

const DEFAULT_CHARS_PER_TICK = 6;
const TICK_MS = 16;

/**
 * Reveals a string character-by-character to keep the streamed-text feel even when
 * the AI route returns a single JSON payload. The full text remains the source of
 * truth — this hook is purely cosmetic.
 *
 * Reset by passing `null` (or by toggling `enabled`).
 */
export function useTypewriterReveal(
  fullText: string | null,
  options?: { charsPerTick?: number; enabled?: boolean; tickMs?: number },
): { revealed: string; complete: boolean } {
  const enabled = options?.enabled ?? true;
  const charsPerTick = Math.max(1, options?.charsPerTick ?? DEFAULT_CHARS_PER_TICK);
  const tickMs = Math.max(8, options?.tickMs ?? TICK_MS);

  const [revealed, setRevealed] = useState("");

  useEffect(() => {
    if (!enabled || fullText == null || fullText.length === 0) {
      setRevealed(fullText ?? "");
      return;
    }

    setRevealed("");
    let cursor = 0;
    let cancelled = false;
    const interval = setInterval(() => {
      if (cancelled) return;
      cursor = Math.min(fullText.length, cursor + charsPerTick);
      setRevealed(fullText.slice(0, cursor));
      if (cursor >= fullText.length) {
        clearInterval(interval);
      }
    }, tickMs);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fullText, enabled, charsPerTick, tickMs]);

  const complete =
    fullText == null || fullText.length === 0 || revealed.length >= fullText.length;
  return { revealed, complete };
}
