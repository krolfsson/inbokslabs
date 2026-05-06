"use client";

import { useEffect, useMemo, useState } from "react";
import { computeSwedishOpenPotential } from "@/lib/swedishInboxOpenScore";
import { bandFromPercent, parseInboxAiPoang } from "@/lib/parseInboxAiPoang";

const DEBOUNCE_MS = 620;

const bandStyles: Record<
  ReturnType<typeof bandFromPercent>,
  { bar: string; text: string; ring: string }
> = {
  high: {
    bar: "bg-emerald-500",
    text: "text-emerald-700",
    ring: "stroke-emerald-500/90",
  },
  medium: {
    bar: "bg-amber-500",
    text: "text-amber-800",
    ring: "stroke-amber-500/90",
  },
  low: {
    bar: "bg-rose-500",
    text: "text-rose-700",
    ring: "stroke-rose-500/85",
  },
};

type Props = {
  sender: string;
  subject: string;
  preheader: string;
};

export function OpenPotentialMeter({ sender, subject, preheader }: Props) {
  const heuristic = useMemo(
    () => computeSwedishOpenPotential({ sender, subject, preheader }),
    [sender, subject, preheader],
  );

  const [aiRaw, setAiRaw] = useState("");
  const [aiNoKey, setAiNoKey] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    const timer = setTimeout(() => {
      void (async () => {
        setAiBusy(true);
        setAiError(null);
        setAiNoKey(false);
        setAiRaw("");
        try {
          const res = await fetch("/api/inbox-ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sender, subject, preheader }),
            signal: ac.signal,
          });

          if (res.status === 503) {
            let errCode = "";
            try {
              const j = (await res.json()) as { error?: string };
              errCode = j.error ?? "";
            } catch {
              /* ignore */
            }
            if (errCode === "NO_KEY") {
              setAiNoKey(true);
              return;
            }
            setAiError("AI-tjänsten är inte konfigurerad just nu.");
            return;
          }

          if (!res.ok) {
            setAiError("Kunde inte hämta AI-analys.");
            return;
          }

          const reader = res.body?.getReader();
          if (!reader) {
            setAiError("Saknar svarström från servern.");
            return;
          }

          const dec = new TextDecoder();
          while (!ac.signal.aborted) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = dec.decode(value, { stream: true });
            if (chunk) setAiRaw((prev) => prev + chunk);
          }
        } catch (e) {
          if (ac.signal.aborted) return;
          const name =
            e && typeof e === "object" && "name" in e
              ? String((e as Error).name)
              : "";
          if (name === "AbortError") return;
          setAiError(e instanceof Error ? e.message : "Något gick fel.");
        } finally {
          if (!ac.signal.aborted) setAiBusy(false);
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      ac.abort();
    };
  }, [sender, subject, preheader]);

  const parsed = useMemo(() => parseInboxAiPoang(aiRaw), [aiRaw]);
  const displayScore = parsed.score ?? heuristic.percent;
  const displayBand = bandFromPercent(displayScore);
  const styles = bandStyles[displayBand];
  const radius = 36;
  const stroke = 5;
  const c = 2 * Math.PI * radius;
  const dash = (displayScore / 100) * c;

  const scoreSourceLabel = aiNoKey
    ? "Regelmodell — lägg till OPENAI_API_KEY för AI"
    : parsed.score !== null
      ? "AI + regelhjälp"
      : aiBusy && !parsed.parsedHeader
        ? "Regelmodell — AI hämtas…"
        : aiBusy
          ? "Regelmodell tills analysen läst av POÄNG-raden"
          : aiRaw.length > 0 && parsed.score === null
            ? "AI öppnar du under Visa analys"
            : "Regelmodell";

  const showAiBlock = !aiNoKey || aiError;

  return (
    <div
      className="rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
      aria-live="polite"
      aria-atomic="false"
    >
      <div className="flex items-start gap-4">
        <div className="relative shrink-0" aria-hidden>
          <svg width="88" height="88" className="-rotate-90">
            <circle
              cx="44"
              cy="44"
              r={radius}
              fill="none"
              className="stroke-zinc-200/90"
              strokeWidth={stroke}
            />
            <circle
              cx="44"
              cy="44"
              r={radius}
              fill="none"
              className={styles.ring}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c - dash}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
            <span
              className={`text-2xl font-semibold tabular-nums ${styles.text}`}
              aria-label={`Öppningspotential ${displayScore} av 100`}
            >
              {displayScore}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              %
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="text-sm font-semibold tracking-tight text-zinc-900">
            Öppningspotential
          </h3>
          <p className="mt-1 text-[11px] leading-snug text-zinc-500">
            {scoreSourceLabel}. Poängen är en bedömning av rubrik + ingress för
            svensk inkorg — inte ett historiskt öppningsgradsmått.
          </p>
        </div>
      </div>

      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100"
        role="presentation"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out ${styles.bar}`}
          style={{ width: `${displayScore}%` }}
        />
      </div>

      {aiNoKey ? (
        <p className="mt-4 rounded-xl bg-zinc-50 px-3 py-2.5 text-[12px] leading-snug text-zinc-600">
          För <span className="font-medium text-zinc-800">live AI-analys</span>{" "}
          behövs <code className="rounded bg-zinc-200/80 px-1 py-0.5 text-[11px]">OPENAI_API_KEY</code>{" "}
          i <code className="rounded bg-zinc-200/80 px-1 py-0.5 text-[11px]">web/.env.local</code>{" "}
          (lokal dev) eller i Vercel Environment Variables för produktion. Poängen ovan är
          regelbaserad; öppna <span className="font-medium text-zinc-800">Visa analys</span> för
          regelförklaringar.
        </p>
      ) : null}

      {aiError && !aiNoKey ? (
        <p className="mt-4 text-[12px] text-rose-600" role="alert">
          {aiError}
        </p>
      ) : null}

      <details className="mt-4 [&[open]>summary_.details-chevron]:rotate-180">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-3 py-2.5 text-sm font-medium text-zinc-800 outline-none hover:bg-zinc-100/80 [&::-webkit-details-marker]:hidden">
          <span>Visa analys</span>
          <svg
            className="details-chevron size-4 shrink-0 text-zinc-400 transition-transform duration-200"
            aria-hidden
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
          </svg>
        </summary>

        <div className="mt-3 border-t border-zinc-100 pt-4">
          {showAiBlock && !aiError && !aiNoKey ? (
            <div className="mb-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Live AI-analys
                </h4>
                {aiBusy ? (
                  <span className="text-[11px] text-zinc-400">
                    <span className="inline-flex items-center gap-1">
                      <span className="size-1.5 animate-pulse rounded-full bg-zinc-400" />
                      Uppdateras
                    </span>
                  </span>
                ) : null}
              </div>
              {aiBusy && aiRaw.length === 0 ? (
                <p className="mt-2 text-[12px] text-zinc-500">
                  Ansluter till modellen…
                </p>
              ) : (
                <div className="mt-2 min-h-[3rem] whitespace-pre-wrap text-[12px] leading-relaxed text-zinc-700">
                  {parsed.analysis.trim() ? (
                    parsed.analysis.trim()
                  ) : aiBusy ? (
                    aiRaw.length === 0 ? (
                      <span className="text-zinc-500">Läser svar…</span>
                    ) : (
                      <span className="text-zinc-500">
                        Analyserar första raden (POÄNG)…
                      </span>
                    )
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                  {aiBusy ? (
                    <span
                      className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-zinc-400 align-middle"
                      aria-hidden
                    />
                  ) : null}
                </div>
              )}
            </div>
          ) : null}

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Snabbkoll · regler
            </h4>
            <ul
              className="mt-2 space-y-2 text-[12px] leading-snug text-zinc-600"
              aria-label="Regelbaserade signaler"
            >
              {heuristic.signals.slice(0, 4).map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span
                    className={
                      s.delta >= 0
                        ? "mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500"
                        : "mt-1.5 size-1.5 shrink-0 rounded-full bg-rose-400"
                    }
                    aria-hidden
                  />
                  <span>{s.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </details>
    </div>
  );
}
