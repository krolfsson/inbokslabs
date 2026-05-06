"use client";

import { useMemo, useState } from "react";
import { InboxPreview } from "@/components/InboxPreview";
import {
  nearestPresetLabel,
  scalesFromSlider,
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
  /** 0 = smallest text scale, 100 = largest (interpolates preset curve). */
  const [textSlider, setTextSlider] = useState(50);

  const { ios: iosScale, android: androidScale } = useMemo(
    () => scalesFromSlider(textSlider),
    [textSlider],
  );

  const counts = useMemo(() => {
    return {
      subject: subject.length,
      preheader: preheader.length,
    };
  }, [subject, preheader]);

  const sizeLabel = nearestPresetLabel(textSlider);

  const fieldClass =
    "w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-[#ff5c47]/40 focus:ring-2 focus:ring-[#ff5c47]/20";

  const selectClass =
    "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none focus:border-[#ff5c47]/40 focus:ring-2 focus:ring-[#ff5c47]/20";

  return (
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
            <div className="flex items-center gap-3">
              <span className="shrink-0 text-xs font-medium text-zinc-400">
                A
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={0.5}
                value={textSlider}
                onChange={(e) => setTextSlider(Number(e.target.value))}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={textSlider}
                aria-label="Text size for inbox previews"
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-[#ff5c47] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#ff5c47] [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[#ff5c47]"
              />
              <span className="shrink-0 text-lg font-medium leading-none text-zinc-400">
                A
              </span>
            </div>
            <p className="text-[11px] leading-snug text-zinc-500">
              Interpolates iOS Dynamic Type–style and Android font-scale anchors.
              Smaller ↔ larger like display &amp; text sizing in system settings.
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
  );
}
