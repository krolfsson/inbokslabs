"use client";

import { useMemo, useState } from "react";
import { InboxPreview } from "@/components/InboxPreview";
import {
  TEXT_SIZE_OPTIONS,
  type TextSizePreset,
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
  const [textSize, setTextSize] = useState<TextSizePreset>("large");

  const counts = useMemo(() => {
    return {
      subject: subject.length,
      preheader: preheader.length,
    };
  }, [subject, preheader]);

  return (
    <div className="space-y-10">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset] backdrop-blur">
        <div className="grid gap-6 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Sender name
            </span>
            <input
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none ring-[#ff5c47]/0 transition focus:border-[#ff5c47]/50 focus:ring-2 focus:ring-[#ff5c47]/30"
              placeholder="Company or person"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Text size (display & content)
            </span>
            <select
              value={textSize}
              onChange={(e) =>
                setTextSize(e.target.value as TextSizePreset)
              }
              title={
                TEXT_SIZE_OPTIONS.find((o) => o.value === textSize)
                  ?.description
              }
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
            >
              {TEXT_SIZE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} title={o.description}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-zinc-600">
              {
                TEXT_SIZE_OPTIONS.find((o) => o.value === textSize)
                  ?.description
              }
            </p>
          </label>
          <div className="grid grid-cols-2 gap-4 md:col-span-2">
            <label className="block space-y-2">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                iPhone theme
              </span>
              <select
                value={iosTheme}
                onChange={(e) =>
                  setIosTheme(e.target.value as "light" | "dark")
                }
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Gmail theme
              </span>
              <select
                value={gmailTheme}
                onChange={(e) =>
                  setGmailTheme(e.target.value as "light" | "dark")
                }
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
          </div>
        </div>

        <label className="mt-6 block space-y-2">
          <span className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-zinc-500">
            Subject
            <span className="font-mono text-[10px] text-zinc-600">
              {counts.subject} chars
            </span>
          </span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none ring-[#ff5c47]/0 transition focus:border-[#ff5c47]/50 focus:ring-2 focus:ring-[#ff5c47]/30"
          />
        </label>

        <label className="mt-4 block space-y-2">
          <span className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-zinc-500">
            Preheader / preview text
            <span className="font-mono text-[10px] text-zinc-600">
              {counts.preheader} chars
            </span>
          </span>
          <textarea
            value={preheader}
            onChange={(e) => setPreheader(e.target.value)}
            rows={3}
            className="w-full resize-y rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none ring-[#ff5c47]/0 transition focus:border-[#ff5c47]/50 focus:ring-2 focus:ring-[#ff5c47]/30"
          />
        </label>

        <p className="mt-4 text-xs leading-relaxed text-zinc-500">
          Sizes follow Apple’s Dynamic Type ratios (vs default Large) on the iPhone
          mock and Android font-scale presets on Gmail — not the same numbers as each
          other, like real OS settings. Truncation uses the same fixed column widths as
          the reference canvases (ellipsis), not a character cap. Pixel-perfect vs
          production Mail/Gmail still varies by OS version, weight, and real device
          font metrics.
        </p>
      </div>

      <InboxPreview
        sender={sender}
        subject={subject}
        preheader={preheader}
        iosTheme={iosTheme}
        gmailTheme={gmailTheme}
        textSize={textSize}
      />
    </div>
  );
}
