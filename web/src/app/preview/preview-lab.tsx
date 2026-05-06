"use client";

import { useMemo, useState } from "react";
import { EmailHtmlDevicePreview } from "@/components/EmailHtmlDevicePreview";
import { InboxPreview } from "@/components/InboxPreview";
import {
  TEXT_SIZE_PRESET_ORDER,
  TEXT_SIZE_STEP_MAX,
  TEXT_SIZE_STEP_SHORT,
  labelAtStep,
  scalesAtStep,
} from "@/lib/inboxTypography";

export function PreviewLab() {
  const [sender, setSender] = useState("Lithmuth");
  const [subject, setSubject] = useState(
    "Your week in focus — quieter inboxes, bolder ideas",
  );
  const [preheader, setPreheader] = useState(
    "Plus: one habit teams use before hitting send on big campaigns.",
  );
  const [iosTheme, setIosTheme] = useState<"light" | "dark">("light");
  const [gmailTheme, setGmailTheme] = useState<"light" | "dark">("light");
  /** Discrete step 0…6 — one stop per typography preset (fewest stops). */
  const [textStep, setTextStep] = useState(3);

  const { ios: iosScale, android: androidScale } = useMemo(
    () => scalesAtStep(textStep),
    [textStep],
  );

  const counts = useMemo(() => {
    return {
      subject: subject.length,
      preheader: preheader.length,
    };
  }, [subject, preheader]);

  const sizeLabel = labelAtStep(textStep);

  const fieldClass =
    "w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-[#ff5c47]/40 focus:ring-2 focus:ring-[#ff5c47]/20";

  const selectClass =
    "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none focus:border-[#ff5c47]/40 focus:ring-2 focus:ring-[#ff5c47]/20";

  return (
    <>
    <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-10">
      <div className="min-w-0 space-y-5 lg:sticky lg:top-[4.5rem] lg:self-start">
        <header className="space-y-1 lg:pr-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff5c47]">
            Inbox lab
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            Shape how the inbox reads your story
          </h1>
          <p className="text-sm leading-relaxed text-zinc-600">
            Dial in copy and see iPhone Mail and Android Gmail list rows before send.
          </p>
        </header>

        <div className="space-y-5 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
          <label className="block space-y-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Sender name
            </span>
            <input
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              className={fieldClass}
              placeholder="Company or person"
            />
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Text size
              </span>
              <span className="text-[11px] tabular-nums text-zinc-500">
                {sizeLabel} · iOS ×{iosScale.toFixed(3)} · Android ×
                {androidScale.toFixed(3)}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 pt-2 text-xs font-medium text-zinc-400">
                A
              </span>
              <div className="min-w-0 flex-1">
                <div className="relative pb-8 pt-1">
                  <datalist id="text-size-stops">
                    {TEXT_SIZE_PRESET_ORDER.map((_, i) => (
                      <option key={i} value={String(i)} label={TEXT_SIZE_STEP_SHORT[i]} />
                    ))}
                  </datalist>
                  <div
                    aria-hidden
                    className="pointer-events-none absolute left-0 right-0 top-[18px] z-0 grid grid-cols-7"
                  >
                    {TEXT_SIZE_STEP_SHORT.map((_, i) => (
                      <div
                        key={i}
                        className="flex justify-center"
                      >
                        <span
                          className={
                            i === textStep
                              ? "h-3 w-[3px] rounded-full bg-[#ff5c47]"
                              : "h-2 w-px rounded-full bg-zinc-300"
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <input
                    type="range"
                    list="text-size-stops"
                    min={0}
                    max={TEXT_SIZE_STEP_MAX}
                    step={1}
                    value={textStep}
                    onChange={(e) => setTextStep(Number(e.target.value))}
                    aria-valuemin={0}
                    aria-valuemax={TEXT_SIZE_STEP_MAX}
                    aria-valuenow={textStep}
                    aria-valuetext={sizeLabel}
                    aria-label="Text size for inbox previews, seven steps from extra small to extra extra extra large"
                    className="relative z-10 h-9 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-zinc-200 [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-zinc-200 [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#ff5c47] [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#ff5c47]"
                  />
                  <div className="absolute bottom-0 left-0 right-0 grid grid-cols-7 gap-0 pt-1">
                    {TEXT_SIZE_STEP_SHORT.map((abbr, i) => (
                      <button
                        key={abbr}
                        type="button"
                        onClick={() => setTextStep(i)}
                        title={`${labelAtStep(i)} (${TEXT_SIZE_PRESET_ORDER[i]})`}
                        className={
                          i === textStep
                            ? "text-center text-[10px] font-semibold text-[#ff5c47]"
                            : "text-center text-[10px] font-medium text-zinc-400 hover:text-zinc-600"
                        }
                      >
                        {abbr}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <span className="shrink-0 pt-1 text-lg font-medium leading-none text-zinc-400">
                A
              </span>
            </div>
            <p className="text-[11px] leading-snug text-zinc-500">
              Seven stops only (no in-between): iOS Dynamic Type categories and matching
              Android font-scale anchors.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                iPhone theme
              </span>
              <select
                value={iosTheme}
                onChange={(e) =>
                  setIosTheme(e.target.value as "light" | "dark")
                }
                className={selectClass}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Gmail theme
              </span>
              <select
                value={gmailTheme}
                onChange={(e) =>
                  setGmailTheme(e.target.value as "light" | "dark")
                }
                className={selectClass}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Subject
              <span className="font-mono text-[10px] text-zinc-400">
                {counts.subject} chars
              </span>
            </span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={fieldClass}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Preheader / preview text
              <span className="font-mono text-[10px] text-zinc-400">
                {counts.preheader} chars
              </span>
            </span>
            <textarea
              value={preheader}
              onChange={(e) => setPreheader(e.target.value)}
              rows={3}
              className={`${fieldClass} resize-y py-3`}
            />
          </label>

          <p className="text-[11px] leading-relaxed text-zinc-500">
            Truncation is width-based at fixed column sizes (ellipsis), not a character
            cap. Mail/Gmail on real hardware can still differ slightly.
          </p>
        </div>
      </div>

      <div className="mt-10 min-w-0 lg:mt-0">
        <InboxPreview
          sender={sender}
          subject={subject}
          preheader={preheader}
          iosTheme={iosTheme}
          gmailTheme={gmailTheme}
          iosScale={iosScale}
          androidScale={androidScale}
        />
      </div>
    </div>
    <EmailHtmlDevicePreview />
    </>
  );
}
