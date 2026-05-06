"use client";

import { useMemo } from "react";
import {
  computeSwedishOpenPotential,
  type SwedishOpenPotential,
} from "@/lib/swedishInboxOpenScore";

const bandStyles: Record<
  SwedishOpenPotential["band"],
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
  const result = useMemo(
    () => computeSwedishOpenPotential({ sender, subject, preheader }),
    [sender, subject, preheader],
  );

  const styles = bandStyles[result.band];
  const radius = 36;
  const stroke = 5;
  const c = 2 * Math.PI * radius;
  const dash = (result.percent / 100) * c;

  return (
    <div
      className="rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
      aria-live="polite"
      aria-atomic="true"
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
              aria-label={`Indikativ öppningspotential ${result.percent} av 100`}
            >
              {result.percent}
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
            Indikativ poäng utifrån svenska och internationella{" "}
            <span className="whitespace-nowrap">best practices</span> för rubrik
            och ingress — inte en prognos för faktisk öppningsgrad.
          </p>
        </div>
      </div>

      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100"
        role="presentation"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out ${styles.bar}`}
          style={{ width: `${result.percent}%` }}
        />
      </div>

      <ul
        className="mt-3 space-y-2 text-[12px] leading-snug text-zinc-600"
        aria-label="Signaler som påverkat poängen"
      >
        {result.signals.slice(0, 4).map((s, i) => (
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
  );
}
