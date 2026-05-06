"use client";

import {
  TEXT_SIZE_PRESET_ORDER,
  TEXT_SIZE_STEP_MAX,
  TEXT_SIZE_STEP_SHORT,
  labelAtStep,
} from "@/lib/inboxTypography";

type Props = {
  value: number;
  onChange: (step: number) => void;
  /** `sidebar`: smal kolumn med vertikal väljare (XS överst → XL underst). */
  layout?: "horizontal" | "sidebar";
};

/**
 * Fem steg (XS–XL); drag i spåret snappar till närmaste förinställning.
 * Stadium/pill: full rundning + spår i 80 % bredd så tum centrerar mot fem kolumner.
 */
export function TextSizeControl({
  value,
  onChange,
  layout = "horizontal",
}: Props) {
  const sizeLabel = labelAtStep(value);

  if (layout === "sidebar") {
    return (
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-semibold text-brand-deep/90">
            Teckenstorlek
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">
            Som i telefonens tillgänglighetsinställningar —{" "}
            <span className="font-medium text-brand-deep/80">{sizeLabel}</span>
          </p>
        </div>

        <div
          className="flex flex-col gap-1 rounded-2xl border border-brand/18 bg-white/90 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
          role="group"
          aria-label="Teckenstorlek, fem steg"
        >
          {TEXT_SIZE_STEP_SHORT.map((abbr, i) => {
            const active = i === value;
            return (
              <button
                key={abbr}
                type="button"
                onClick={() => onChange(i)}
                aria-pressed={active}
                title={`${labelAtStep(i)} (${TEXT_SIZE_PRESET_ORDER[i]})`}
                className={
                  active
                    ? "rounded-xl bg-brand px-3 py-2.5 text-center text-xs font-semibold text-white shadow-sm transition"
                    : "rounded-xl px-3 py-2.5 text-center text-xs font-medium text-brand-deep/75 transition hover:bg-brand-tint/50 hover:text-brand-deep"
                }
              >
                <span className="tabular-nums">{abbr}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-brand-deep/80">
          Teckenstorlek
        </span>
        <span className="text-xs tabular-nums text-brand-deep/80">
          {sizeLabel}
        </span>
      </div>

      <div className="rounded-[9999px] border border-brand/22 bg-white/95 py-px shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-brand/8">
        <div className="px-2 pb-0.5 pt-1">
          <div className="relative mx-auto h-5 w-4/5">
            <div
              className="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 rounded-full bg-brand/35"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute top-1/2 z-[1] size-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-brand-deep shadow-sm transition-[left] duration-[680ms] ease-[cubic-bezier(0.25,0.76,0.25,0.94)]"
              style={{
                left: `${(value / TEXT_SIZE_STEP_MAX) * 100}%`,
              }}
              aria-hidden
            />
            <input
              type="range"
              min={0}
              max={TEXT_SIZE_STEP_MAX}
              step={1}
              value={value}
              onChange={(e) => onChange(Number(e.target.value))}
              aria-valuemin={0}
              aria-valuemax={TEXT_SIZE_STEP_MAX}
              aria-valuenow={value}
              aria-valuetext={sizeLabel}
              aria-label="Teckenstorlek, fem steg"
              className="absolute inset-x-0 top-1/2 z-[2] h-8 w-full -translate-y-1/2 cursor-grab appearance-none bg-transparent active:cursor-grabbing
                [&::-webkit-slider-runnable-track]:h-px [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent
                [&::-moz-range-track]:h-px [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent
                [&::-webkit-slider-thumb]:-mt-[calc((2rem-1px)/2)] [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-transparent
                [&::-moz-range-thumb]:h-8 [&::-moz-range-thumb]:w-8 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent"
            />
          </div>

          <div className="-mt-0.5 grid grid-cols-5 gap-0 leading-none">
            {TEXT_SIZE_STEP_SHORT.map((abbr, i) => {
              const active = i === value;
              return (
                <button
                  key={abbr}
                  type="button"
                  onClick={() => onChange(i)}
                  className="w-full min-w-0 pb-px pt-px text-center"
                  aria-pressed={active}
                  title={`${labelAtStep(i)} (${TEXT_SIZE_PRESET_ORDER[i]})`}
                >
                  <span
                    className={
                      active
                        ? "text-[8px] font-semibold tabular-nums leading-none text-brand-deep"
                        : "text-[8px] font-medium tabular-nums leading-none text-brand/60 hover:text-brand-deep/90"
                    }
                  >
                    {abbr}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
