"use client";

import {
  TEXT_SIZE_PRESET_ORDER,
  TEXT_SIZE_STEP_SHORT,
  labelAtStep,
} from "@/lib/inboxTypography";

type Props = {
  value: number;
  onChange: (step: number) => void;
};

/**
 * Seven stops; thumb sits in column center — lines up with labels (no native range misalignment).
 */
export function TextSizeControl({ value, onChange }: Props) {
  const sizeLabel = labelAtStep(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400">
          Text size
        </span>
        <span className="text-[10px] tabular-nums text-zinc-500">
          {sizeLabel}
        </span>
      </div>
      <div
        className="relative rounded-full bg-zinc-100 p-1"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={6}
        aria-valuenow={value}
        aria-valuetext={sizeLabel}
        aria-label="Text size, seven steps"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            onChange(Math.max(0, value - 1));
          } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            onChange(Math.min(6, value + 1));
          }
        }}
      >
        <div className="pointer-events-none absolute left-3 right-3 top-1/2 h-2 -translate-y-1/2 rounded-full bg-zinc-200/90" />
        <div className="relative z-[1] flex">
          {TEXT_SIZE_STEP_SHORT.map((abbr, i) => {
            const active = i === value;
            return (
              <button
                key={abbr}
                type="button"
                onClick={() => onChange(i)}
                className="flex min-w-0 flex-1 flex-col items-center gap-1.5 py-1"
                aria-pressed={active}
                title={`${labelAtStep(i)} (${TEXT_SIZE_PRESET_ORDER[i]})`}
              >
                <span className="flex h-5 items-center justify-center">
                  <span
                    className={
                      active
                        ? "size-4 shrink-0 rounded-full border-2 border-white bg-[#ff5c47] shadow-md ring-2 ring-[#ff5c47]/20"
                        : "size-1.5 shrink-0 rounded-full bg-zinc-400/80"
                    }
                  />
                </span>
                <span
                  className={
                    active
                      ? "text-[9px] font-semibold tabular-nums text-[#ff5c47]"
                      : "text-[9px] font-medium tabular-nums text-zinc-400 hover:text-zinc-600"
                  }
                >
                  {abbr}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-[10px] leading-snug text-zinc-400">
        iOS Dynamic Type steps · tap or arrow keys
      </p>
    </div>
  );
}
