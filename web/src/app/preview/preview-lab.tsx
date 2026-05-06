"use client";

import { useMemo, useState } from "react";
import { InboxPreview } from "@/components/InboxPreview";

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
          <div className="grid grid-cols-2 gap-4">
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

        <p className="mt-4 text-xs text-zinc-500">
          Truncation is approximate — real clients vary by font, scale, and width.
          Use this as a fast gut-check before devices and Litmus.
        </p>
      </div>

      <InboxPreview
        sender={sender}
        subject={subject}
        preheader={preheader}
        iosTheme={iosTheme}
        gmailTheme={gmailTheme}
      />
    </div>
  );
}
