"use client";

import { useMemo, useState } from "react";
import { EmailHtmlDevicePreview } from "@/components/EmailHtmlDevicePreview";
import { InboxPreview } from "@/components/InboxPreview";
import { TextSizeControl } from "@/components/TextSizeControl";
import { scalesAtStep } from "@/lib/inboxTypography";

const field =
  "w-full rounded-lg border border-zinc-200/90 bg-white px-3 py-2 text-sm text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/5";

const select =
  "w-full rounded-lg border border-zinc-200/90 bg-white px-3 py-2 text-sm text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/5";

type TabId = "inbox" | "email";

export function PreviewWorkbench() {
  const [tab, setTab] = useState<TabId>("inbox");

  const [sender, setSender] = useState("Lithmuth");
  const [subject, setSubject] = useState(
    "Your week in focus — quieter inboxes, bolder ideas",
  );
  const [preheader, setPreheader] = useState(
    "Plus: one habit teams use before hitting send on big campaigns.",
  );
  const [iosTheme, setIosTheme] = useState<"light" | "dark">("light");
  const [gmailTheme, setGmailTheme] = useState<"light" | "dark">("light");
  const [textStep, setTextStep] = useState(3);

  const { ios: iosScale, android: androidScale } = useMemo(
    () => scalesAtStep(textStep),
    [textStep],
  );

  const counts = useMemo(
    () => ({ subject: subject.length, preheader: preheader.length }),
    [subject, preheader],
  );

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        {/* Binder / tab rail */}
        <div className="flex items-stretch border-b border-zinc-100 bg-zinc-50/80">
          <div
            className="flex items-center gap-1.5 border-r border-zinc-100 px-4 py-3"
            aria-hidden
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 rounded-full bg-zinc-300/90 ring-1 ring-zinc-200/80"
              />
            ))}
          </div>
          <div role="tablist" className="flex min-w-0 flex-1">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "inbox"}
              id="tab-inbox"
              onClick={() => setTab("inbox")}
              className={
                tab === "inbox"
                  ? "relative flex-1 border-b-2 border-b-[#ff5c47] bg-white px-5 py-3.5 text-left text-sm font-semibold text-zinc-900"
                  : "flex-1 border-b-2 border-b-transparent px-5 py-3.5 text-left text-sm font-medium text-zinc-500 transition hover:bg-white/60 hover:text-zinc-700"
              }
            >
              Inbox lines
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "email"}
              id="tab-email"
              onClick={() => setTab("email")}
              className={
                tab === "email"
                  ? "relative flex-1 border-b-2 border-b-[#ff5c47] bg-white px-5 py-3.5 text-left text-sm font-semibold text-zinc-900"
                  : "flex-1 border-b-2 border-b-transparent px-5 py-3.5 text-left text-sm font-medium text-zinc-500 transition hover:bg-white/60 hover:text-zinc-700"
              }
            >
              Full email HTML
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div
            role="tabpanel"
            aria-labelledby="tab-inbox"
            hidden={tab !== "inbox"}
            className={tab !== "inbox" ? "hidden" : ""}
          >
            <div className="mb-8 max-w-xl">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                Subject &amp; preheader
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                iPhone Mail and Gmail rows · fixed widths · ellipsis like real inbox
              </p>
            </div>
            <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-12">
              <div className="min-w-0 space-y-6">
                <div className="space-y-4">
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400">
                      Sender
                    </span>
                    <input
                      value={sender}
                      onChange={(e) => setSender(e.target.value)}
                      className={field}
                      placeholder="Name or brand"
                    />
                  </label>

                  <TextSizeControl
                    value={textStep}
                    onChange={setTextStep}
                  />

                  <p className="text-[10px] text-zinc-400">
                    iOS ×{iosScale.toFixed(3)} · Android ×{androidScale.toFixed(3)}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1.5">
                      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400">
                        iPhone
                      </span>
                      <select
                        value={iosTheme}
                        onChange={(e) =>
                          setIosTheme(e.target.value as "light" | "dark")
                        }
                        className={select}
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </select>
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400">
                        Gmail
                      </span>
                      <select
                        value={gmailTheme}
                        onChange={(e) =>
                          setGmailTheme(e.target.value as "light" | "dark")
                        }
                        className={select}
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </select>
                    </label>
                  </div>

                  <label className="block space-y-1.5">
                    <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400">
                      Subject
                      <span className="font-mono text-[9px] font-normal normal-case text-zinc-400">
                        {counts.subject}
                      </span>
                    </span>
                    <input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className={field}
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400">
                      Preheader
                      <span className="font-mono text-[9px] font-normal normal-case text-zinc-400">
                        {counts.preheader}
                      </span>
                    </span>
                    <textarea
                      value={preheader}
                      onChange={(e) => setPreheader(e.target.value)}
                      rows={3}
                      className={`${field} resize-y py-2.5`}
                    />
                  </label>
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
          </div>

          <div
            role="tabpanel"
            aria-labelledby="tab-email"
            hidden={tab !== "email"}
            className={tab !== "email" ? "hidden" : ""}
          >
            <div className="mb-6 max-w-xl">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                HTML in phone frame
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Paste code · optional asset base for relative images · save PNG
              </p>
            </div>
            <EmailHtmlDevicePreview embedded />
          </div>
        </div>
      </div>
    </div>
  );
}
