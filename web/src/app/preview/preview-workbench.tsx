"use client";

import { useMemo, useState } from "react";
import { EmailHtmlDevicePreview } from "@/components/EmailHtmlDevicePreview";
import { InboxPreview } from "@/components/InboxPreview";
import { OpenPotentialMeter } from "@/components/OpenPotentialMeter";
import { TextSizeControl } from "@/components/TextSizeControl";
import { DataHandlingNote } from "@/components/DataHandlingNote";
import {
  SlidePanels,
  SlidingWorkbenchTabs,
  previewWorkbenchTabPanelId,
} from "@/components/SlidingSegment";
import { scalesAtStep } from "@/lib/inboxTypography";

const field =
  "w-full rounded-2xl border border-brand/10 bg-white/90 px-4 py-3 text-[15px] text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-brand/35 focus:bg-white focus:shadow-[0_0_0_4px_rgba(79,70,229,0.10)]";

type TabId = "inbox" | "email";

const tabs: { id: TabId; label: string }[] = [
  { id: "inbox", label: "Inkorg" },
  { id: "email", label: "E-post" },
];

export function PreviewWorkbench() {
  const [tab, setTab] = useState<TabId>("inbox");

  const [sender, setSender] = useState("Avsändare");
  const [subject, setSubject] = useState("Skriv din ämnesrad här");
  const [preheader, setPreheader] = useState("Skriv din ingress här");
  /** 0=XS … 2=M (referens 1,0×) … 4=XL — motsvarar tidigare ”standard” på steg M. */
  const [textStep, setTextStep] = useState(2);

  const { ios: iosScale, android: androidScale } = useMemo(
    () => scalesAtStep(textStep),
    [textStep],
  );

  const counts = useMemo(
    () => ({ subject: subject.length, preheader: preheader.length }),
    [subject, preheader],
  );

  return (
    <section className="relative overflow-hidden rounded-[38px] border border-brand/15 bg-white/92 shadow-[0_40px_100px_rgba(79,70,229,0.09)] backdrop-blur-xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white"
      />

      <div className="flex items-center justify-between gap-4 border-b border-brand/10 bg-brand/5 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2" aria-hidden>
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#ffbd2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </div>
        <SlidingWorkbenchTabs<TabId>
          value={tab}
          onChange={setTab}
          options={
            [
              { value: tabs[0]!.id, label: tabs[0]!.label },
              { value: tabs[1]!.id, label: tabs[1]!.label },
            ] as const
          }
        />
        <div className="w-[52px]" aria-hidden />
      </div>

      <div className="p-5 sm:p-6 lg:p-8">
        <SlidePanels activeIndex={tab === "inbox" ? 0 : 1}>
          {[
            <div
              key="panel-inbox"
              id={previewWorkbenchTabPanelId(0)}
              role="tabpanel"
              aria-labelledby="tab-inbox"
              aria-hidden={tab !== "inbox"}
              tabIndex={tab === "inbox" ? undefined : -1}
              className={tab !== "inbox" ? "pointer-events-none" : undefined}
            >
              <div className="grid gap-8 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)] lg:gap-8 lg:items-start">
                <div className="rounded-[30px] border border-brand/10 bg-brand-tint/55 p-5 shadow-[inset_0_0_0_1px_rgba(79,70,229,0.06)]">
                  <div className="mb-6">
                    <h2 className="text-2xl font-semibold tracking-[-0.035em] text-brand">
                      Inkorgsförhandsvisning
                    </h2>
                    <p className="mt-1 text-sm text-zinc-600">
                      Skriv raden. Se hur den ter sig i inkorgen.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <label className="block space-y-2">
                      <span className="text-xs font-medium text-brand-deep/85">
                        Avsändare
                      </span>
                      <input
                        value={sender}
                        onChange={(e) => setSender(e.target.value)}
                        className={field}
                        placeholder="Avsändare"
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="flex items-center justify-between text-xs font-medium text-brand-deep/85">
                        Ämnesrad
                        <span className="font-mono text-[11px] font-normal text-zinc-400">
                          {counts.subject}
                        </span>
                      </span>
                      <input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className={field}
                        placeholder="Skriv din ämnesrad här"
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="flex items-center justify-between text-xs font-medium text-brand-deep/85">
                        Ingress (preheader)
                        <span className="font-mono text-[11px] font-normal text-zinc-400">
                          {counts.preheader}
                        </span>
                      </span>
                      <textarea
                        value={preheader}
                        onChange={(e) => setPreheader(e.target.value)}
                        rows={4}
                        className={`${field} resize-none`}
                        placeholder="Skriv din ingress här"
                      />
                    </label>

                    <OpenPotentialMeter
                      sender={sender}
                      subject={subject}
                      preheader={preheader}
                    />

                    <DataHandlingNote variant="inbox" />
                  </div>
                </div>

                <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:gap-6">
                  <div className="min-h-0 min-w-0 flex-1 rounded-[30px] border border-brand/10 bg-brand-tint/55 p-4 shadow-[inset_0_0_0_1px_rgba(79,70,229,0.06)] sm:p-5">
                    <InboxPreview
                      sender={sender}
                      subject={subject}
                      preheader={preheader}
                      iosScale={iosScale}
                      androidScale={androidScale}
                    />
                  </div>
                  <div className="shrink-0 rounded-[30px] border border-brand/10 bg-brand-tint/55 p-4 shadow-[inset_0_0_0_1px_rgba(79,70,229,0.06)] sm:p-5 lg:w-[min(100%,220px)] lg:max-w-[240px]">
                    <TextSizeControl
                      value={textStep}
                      onChange={setTextStep}
                      layout="sidebar"
                    />
                  </div>
                </div>
              </div>
            </div>,
            <div
              key="panel-email"
              id={previewWorkbenchTabPanelId(1)}
              role="tabpanel"
              aria-labelledby="tab-email"
              aria-hidden={tab !== "email"}
              tabIndex={tab === "email" ? undefined : -1}
              className={tab !== "email" ? "pointer-events-none" : undefined}
            >
              <EmailHtmlDevicePreview embedded />
            </div>,
          ]}
        </SlidePanels>
      </div>
    </section>
  );
}
