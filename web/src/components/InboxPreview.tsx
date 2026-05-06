"use client";

import { GMAIL_BASE_SP, IOS_BASE_PT, LAYOUT } from "@/lib/inboxTypography";

type Theme = "light" | "dark";

export function InboxPreview(props: {
  sender: string;
  subject: string;
  preheader: string;
  iosTheme: Theme;
  gmailTheme: Theme;
  iosScale: number;
  androidScale: number;
}) {
  const { sender, subject, preheader, iosTheme, gmailTheme, iosScale, androidScale } =
    props;

  const iosM = iosScale;
  const andM = androidScale;

  const ios = {
    sender: IOS_BASE_PT.sender * iosM,
    time: IOS_BASE_PT.time * iosM,
    subject: IOS_BASE_PT.subject * iosM,
    preview: IOS_BASE_PT.preview * iosM,
  };

  const gm = {
    sender: GMAIL_BASE_SP.sender * andM,
    time: GMAIL_BASE_SP.time * andM,
    subject: GMAIL_BASE_SP.subject * andM,
    preview: GMAIL_BASE_SP.preview * andM,
  };

  const iosBg =
    iosTheme === "dark"
      ? "bg-[#000000] text-white border-zinc-800"
      : "bg-[#f2f2f7] text-black border-zinc-200";
  const gmailBg =
    gmailTheme === "dark"
      ? "bg-[#202124] text-[#e8eaed] border-[#3c4043]"
      : "bg-white text-[#202124] border-[#e0e0e0]";

  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium uppercase tracking-widest text-zinc-500">
            iPhone (Mail)
          </h2>
          <span className="text-xs text-zinc-500">
            {iosTheme === "dark" ? "Dark" : "Light"}
          </span>
        </div>
        <p className="text-[11px] leading-snug text-zinc-500">
          {LAYOUT.iphoneWidthPx}px canvas · {LAYOUT.iosTextColumnPx}px text column · SF
          Pro–driven sizes × Dynamic Type
        </p>

        <div
          className={`mx-auto overflow-hidden rounded-[18px] border border-black/10 shadow-lg shadow-zinc-900/10 ${iosBg}`}
          style={{ width: LAYOUT.iphoneWidthPx, maxWidth: "100%" }}
        >
          <div className="border-b border-white/10 bg-black/10 px-4 py-2 text-center font-medium tracking-wide text-zinc-500">
            <span style={{ fontSize: Math.round(11 * iosM) }}>Inbox</span>
          </div>
          <div
            className="py-2 pr-4"
            style={{
              paddingLeft: LAYOUT.iosHorizontalPaddingPx,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-rose-500 font-semibold text-white"
                style={{
                  width: LAYOUT.iosAvatarPx,
                  height: LAYOUT.iosAvatarPx,
                  fontSize: Math.max(10, Math.round(12 * iosM)),
                }}
              >
                {initials(sender)}
              </div>
              <div
                className="min-w-0 shrink"
                style={{
                  width: LAYOUT.iosTextColumnPx,
                  maxWidth: LAYOUT.iosTextColumnPx,
                }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`truncate font-semibold leading-tight ${iosTheme === "dark" ? "text-white" : "text-black"}`}
                    style={{
                      fontFamily:
                        'system-ui, -apple-system, "SF Pro Text", "SF Pro Display", sans-serif',
                      fontSize: ios.sender,
                      lineHeight: 1.25,
                      letterSpacing: ios.sender >= 17 ? "-0.24px" : "-0.2px",
                    }}
                  >
                    {sender || "Sender"}
                  </span>
                  <span
                    className="shrink-0 text-zinc-500"
                    style={{
                      fontFamily:
                        'system-ui, -apple-system, "SF Pro Text", sans-serif',
                      fontSize: ios.time,
                      lineHeight: 1.2,
                      fontWeight: 400,
                    }}
                  >
                    9:41 AM
                  </span>
                </div>
                <p
                  className={`truncate font-semibold leading-snug ${iosTheme === "dark" ? "text-white" : "text-black"}`}
                  style={{
                    fontFamily:
                      'system-ui, -apple-system, "SF Pro Text", sans-serif',
                    fontSize: ios.subject,
                    lineHeight: 1.26,
                    marginTop: "2px",
                    letterSpacing: "-0.3px",
                  }}
                >
                  {subject || " "}
                </p>
                <p
                  className={`line-clamp-2 leading-snug ${iosTheme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}
                  style={{
                    fontFamily:
                      'system-ui, -apple-system, "SF Pro Text", sans-serif',
                    fontWeight: 400,
                    fontSize: ios.preview,
                    lineHeight: 1.28,
                    marginTop: "1px",
                  }}
                >
                  {preheader || " "}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium uppercase tracking-widest text-zinc-500">
            Android (Gmail)
          </h2>
          <span className="text-xs text-zinc-500">
            {gmailTheme === "dark" ? "Dark" : "Light"}
          </span>
        </div>
        <p className="text-[11px] leading-snug text-zinc-500">
          {LAYOUT.gmailWidthDp}dp canvas · {LAYOUT.gmailTextColumnPx}px text column · Roboto
          @ sp × fontScale
        </p>

        <div
          className={`mx-auto overflow-hidden rounded-[18px] border border-black/10 shadow-lg shadow-zinc-900/10 ${gmailBg}`}
          style={{ width: LAYOUT.gmailWidthDp, maxWidth: "100%" }}
        >
          <div
            className={`border-b px-4 py-2 text-center font-medium ${gmailTheme === "dark" ? "border-[#3c4043] text-zinc-400" : "border-zinc-200 text-zinc-500"}`}
          >
            <span
              style={{
                fontFamily: '"Roboto", sans-serif',
                fontSize: Math.round(12 * andM),
                fontWeight: 500,
              }}
            >
              Primary
            </span>
          </div>
          <div
            className="flex items-start gap-3 py-3 pr-4"
            style={{ paddingLeft: LAYOUT.gmailHorizontalPaddingPx }}
          >
            <div
              className={`flex shrink-0 items-center justify-center rounded-full font-medium ${
                gmailTheme === "dark"
                  ? "bg-[#5f6368] text-white"
                  : "bg-[#1a73e8] text-white"
              }`}
              style={{
                width: LAYOUT.gmailAvatarPx,
                height: LAYOUT.gmailAvatarPx,
                fontSize: Math.round(13 * andM),
              }}
            >
              {initials(sender)}
            </div>
            <div
              className="min-w-0 shrink"
              style={{
                width: LAYOUT.gmailTextColumnPx,
                maxWidth: LAYOUT.gmailTextColumnPx,
              }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className="truncate"
                  style={{
                    fontFamily: '"Roboto", "Roboto Draft", "Helvetica Neue", Helvetica, Arial, sans-serif',
                    fontWeight: 500,
                    fontSize: gm.sender,
                    lineHeight: 1.35,
                    letterSpacing: "0.00625em",
                  }}
                >
                  {sender || "Sender"}
                </span>
                <span
                  className={`shrink-0 ${gmailTheme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"}`}
                  style={{
                    fontFamily: '"Roboto", sans-serif',
                    fontWeight: 400,
                    fontSize: gm.time,
                    lineHeight: 1.3,
                  }}
                >
                  9:41 AM
                </span>
              </div>
              <p
                className="truncate font-medium leading-snug"
                style={{
                  fontFamily: '"Roboto", sans-serif',
                  fontSize: gm.subject,
                  lineHeight: 1.4,
                  marginTop: "2px",
                }}
              >
                {subject || " "}
              </p>
              <p
                className={`line-clamp-2 leading-snug ${gmailTheme === "dark" ? "text-[#bdc1c6]" : "text-[#5f6368]"}`}
                style={{
                  fontFamily: '"Roboto", sans-serif',
                  fontWeight: 400,
                  fontSize: gm.preview,
                  lineHeight: 1.45,
                  marginTop: "2px",
                }}
              >
                {preheader || " "}
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
