"use client";

const MAX_SUBJECT_IOS = 42;
const MAX_PREVIEW_IOS = 78;
const MAX_SUBJECT_GMAIL = 48;
const MAX_PREVIEW_GMAIL = 72;

function truncate(s: string, max: number) {
  const t = s.trim();
  if (t.length <= max) return t;
  return t.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
}

type Theme = "light" | "dark";

export function InboxPreview(props: {
  sender: string;
  subject: string;
  preheader: string;
  iosTheme: Theme;
  gmailTheme: Theme;
}) {
  const { sender, subject, preheader, iosTheme, gmailTheme } = props;

  const subIos = truncate(subject, MAX_SUBJECT_IOS);
  const prevIos = truncate(preheader, MAX_PREVIEW_IOS);
  const subGm = truncate(subject, MAX_SUBJECT_GMAIL);
  const prevGm = truncate(preheader, MAX_PREVIEW_GMAIL);

  const iosBg =
    iosTheme === "dark"
      ? "bg-[#000000] text-white border-zinc-800"
      : "bg-[#f2f2f7] text-black border-zinc-200";
  const gmailBg =
    gmailTheme === "dark"
      ? "bg-[#202124] text-[#e8eaed] border-[#3c4043]"
      : "bg-white text-[#202124] border-[#e0e0e0]";

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-widest text-zinc-500">
            iPhone (Mail)
          </h2>
          <span className="text-xs text-zinc-500">
            {iosTheme === "dark" ? "Dark" : "Light"}
          </span>
        </div>
        <div
          className={`overflow-hidden rounded-[18px] border shadow-[0_20px_60px_-24px_rgba(0,0,0,0.6)] ${iosBg}`}
        >
          <div className="border-b border-white/10 bg-black/10 px-4 py-2 text-center text-[11px] font-medium tracking-wide text-zinc-500">
            Inbox
          </div>
          <div className="px-3 py-2">
            <div className="flex gap-3 rounded-xl px-2 py-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-rose-500 text-sm font-semibold text-white">
                {initials(sender)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`truncate text-[15px] font-semibold leading-tight ${iosTheme === "dark" ? "text-white" : "text-black"}`}
                    style={{ fontFamily: "system-ui, -apple-system, SF Pro Text, sans-serif" }}
                  >
                    {sender || "Sender"}
                  </span>
                  <span className="shrink-0 text-[13px] text-zinc-500">9:41 AM</span>
                </div>
                <p
                  className={`mt-0.5 line-clamp-1 text-[15px] font-semibold leading-snug ${iosTheme === "dark" ? "text-white" : "text-black"}`}
                  style={{ fontFamily: "system-ui, -apple-system, SF Pro Text, sans-serif" }}
                >
                  {subIos}
                </p>
                <p
                  className={`mt-0.5 line-clamp-2 text-[15px] leading-snug ${iosTheme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}
                  style={{ fontFamily: "system-ui, -apple-system, SF Pro Text, sans-serif" }}
                >
                  {prevIos}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-widest text-zinc-500">
            Android (Gmail)
          </h2>
          <span className="text-xs text-zinc-500">
            {gmailTheme === "dark" ? "Dark" : "Light"}
          </span>
        </div>
        <div
          className={`overflow-hidden rounded-[18px] border shadow-[0_20px_60px_-24px_rgba(0,0,0,0.6)] ${gmailBg}`}
        >
          <div
            className={`border-b px-4 py-2 text-center text-[12px] font-medium ${gmailTheme === "dark" ? "border-[#3c4043] text-zinc-400" : "border-zinc-200 text-zinc-500"}`}
          >
            Primary
          </div>
          <div className="flex gap-3 px-3 py-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                gmailTheme === "dark"
                  ? "bg-[#5f6368] text-white"
                  : "bg-[#1a73e8] text-white"
              }`}
            >
              {initials(sender)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className="truncate text-[14px] font-medium"
                  style={{ fontFamily: "Roboto, Helvetica, Arial, sans-serif" }}
                >
                  {sender || "Sender"}
                </span>
                <span
                  className={`shrink-0 text-[12px] ${gmailTheme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"}`}
                >
                  9:41 AM
                </span>
              </div>
              <p
                className="mt-0.5 line-clamp-2 text-[14px] leading-snug"
                style={{ fontFamily: "Roboto, Helvetica, Arial, sans-serif" }}
              >
                <span className="font-medium">{subGm}</span>
                <span className={gmailTheme === "dark" ? " text-[#bdc1c6]" : " text-[#5f6368]"}>
                  {" "}
                  — {prevGm}
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
