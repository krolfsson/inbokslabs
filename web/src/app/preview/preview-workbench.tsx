"use client";

import { useMemo, useState } from "react";
import { EmailHtmlDevicePreview } from "@/components/EmailHtmlDevicePreview";
import { InboxPreview } from "@/components/InboxPreview";
import { OpenPotentialMeter } from "@/components/OpenPotentialMeter";
import { TextSizeControl } from "@/components/TextSizeControl";
import { scalesAtStep } from "@/lib/inboxTypography";

const field =
  "w-full rounded-2xl border border-transparent bg-zinc-100/80 px-4 py-3 text-[15px] text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,0,0,0.04)]";

type TabId = "inbox" | "email";
type Theme = "light" | "dark";

const tabs: { id: TabId; label: string }[] = [
  { id: "inbox", label: "Inbox" },
  { id: "email", label: "Email" },
];

export function PreviewWorkbench() {
  const [tab, setTab] = useState<TabId>("inbox");

  const [sender, setSender] = useState("Lithmuth");
  const [subject, setSubject] = useState(
    "Your week in focus — quieter inboxes, bolder ideas",
  );
  const [preheader, setPreheader] = useState(
    "Plus: one habit teams use before hitting send on big campaigns.",
  );
  const [iphoneMailTheme, setIphoneMailTheme] = useState<Theme>("light");
  const [iphoneGmailTheme, setIphoneGmailTheme] = useState<Theme>("light");
  const [androidMailTheme, setAndroidMailTheme] = useState<Theme>("light");
  const [androidGmailTheme, setAndroidGmailTheme] = useState<Theme>("light");
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
    <section className="relative overflow-hidden rounded-[38px] border border-white/70 bg-white/75 shadow-[0_40px_120px_rgba(0,0,0,0.10)] backdrop-blur-xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white"
      />

      <div className="flex items-center justify-between gap-4 border-b border-zinc-200/70 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2" aria-hidden>
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#ffbd2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </div>
        <div
          role="tablist"
          aria-label="Preview mode"
          className="mx-auto grid w-full max-w-xs grid-cols-2 rounded-full bg-zinc-100 p-1"
        >
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                id={`tab-${item.id}`}
                onClick={() => setTab(item.id)}
                className={
                  active
                    ? "rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950 shadow-[0_1px_8px_rgba(0,0,0,0.10)]"
                    : "rounded-full px-4 py-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-950"
                }
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <div className="w-[52px]" aria-hidden />
      </div>

      <div className="p-5 sm:p-6 lg:p-8">
        <div
          role="tabpanel"
          aria-labelledby="tab-inbox"
          hidden={tab !== "inbox"}
          className={tab !== "inbox" ? "hidden" : ""}
        >
          <div className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-10">
            <div className="rounded-[30px] bg-zinc-50/90 p-5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold tracking-[-0.035em] text-zinc-950">
                  Inbox preview
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Write the line. See the inbox.
                </p>
              </div>

              <div className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-xs font-medium text-zinc-500">
                    From
                  </span>
                  <input
                    value={sender}
                    onChange={(e) => setSender(e.target.value)}
                    className={field}
                    placeholder="Brand name"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="flex items-center justify-between text-xs font-medium text-zinc-500">
                    Subject
                    <span className="font-mono text-[11px] font-normal text-zinc-400">
                      {counts.subject}
                    </span>
                  </span>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className={field}
                  />
                </label>

                <label className="block space-y-2">
                  <span className="flex items-center justify-between text-xs font-medium text-zinc-500">
                    Preheader
                    <span className="font-mono text-[11px] font-normal text-zinc-400">
                      {counts.preheader}
                    </span>
                  </span>
                  <textarea
                    value={preheader}
                    onChange={(e) => setPreheader(e.target.value)}
                    rows={4}
                    className={`${field} resize-none`}
                  />
                </label>

                <div className="pt-1">
                  <TextSizeControl
                    value={textStep}
                    onChange={setTextStep}
                  />
                </div>

                <OpenPotentialMeter
                  sender={sender}
                  subject={subject}
                  preheader={preheader}
                />
              </div>
            </div>

            <div className="min-w-0 rounded-[30px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] sm:p-6">
              <InboxPreview
                sender={sender}
                subject={subject}
                preheader={preheader}
                iphoneMailTheme={iphoneMailTheme}
                iphoneGmailTheme={iphoneGmailTheme}
                androidMailTheme={androidMailTheme}
                androidGmailTheme={androidGmailTheme}
                onIphoneMailThemeChange={setIphoneMailTheme}
                onIphoneGmailThemeChange={setIphoneGmailTheme}
                onAndroidMailThemeChange={setAndroidMailTheme}
                onAndroidGmailThemeChange={setAndroidGmailTheme}
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
          <EmailHtmlDevicePreview embedded />
        </div>
      </div>
    </section>
  );
}
