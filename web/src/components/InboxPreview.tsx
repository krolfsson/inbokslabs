"use client";

import { useState } from "react";
import { SlidingSegment } from "@/components/SlidingSegment";
import { GMAIL_BASE_SP, IOS_BASE_PT, LAYOUT } from "@/lib/inboxTypography";

type Theme = "light" | "dark";
type Platform = "iphone" | "android";
type Client = "mail" | "gmail";

/** Demonstrationsavsändaren inbokslabs får indigo chip + lägre initial. */
const INBOKSLABS_AVATAR = "#4f46e5";

function isInboksLabsDemoSender(name: string): boolean {
  return name.trim().toLowerCase() === "inbokslabs";
}

/** Glyph i avatars: inbokslabs → vit “i”; annars tidigare initialer. */
function avatarGlyph(name: string): string {
  if (isInboksLabsDemoSender(name)) return "i";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function InboxPreview(props: {
  sender: string;
  subject: string;
  preheader: string;
  iosScale: number;
  androidScale: number;
}) {
  const { sender, subject, preheader, iosScale, androidScale } = props;

  const [platform, setPlatform] = useState<Platform>("iphone");
  const [client, setClient] = useState<Client>("mail");
  const [theme, setTheme] = useState<Theme>("light");

  const iosType = {
    sender: IOS_BASE_PT.sender * iosScale,
    time: IOS_BASE_PT.time * iosScale,
    subject: IOS_BASE_PT.subject * iosScale,
    preview: IOS_BASE_PT.preview * iosScale,
  };

  /** Gmail row + Android Mail–style row (sp / fontScale). */
  const gmailType = {
    sender: GMAIL_BASE_SP.sender * androidScale,
    time: GMAIL_BASE_SP.time * androidScale,
    subject: GMAIL_BASE_SP.subject * androidScale,
    preview: GMAIL_BASE_SP.preview * androidScale,
  };

  const caption =
    `${platform === "iphone" ? "iPhone" : "Android"} · ${client === "mail" ? "Mail" : "Gmail"} · ${theme === "light" ? "Ljus" : "Mörk"}`;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <SlidingSegment<Platform>
          label="Enhet"
          value={platform}
          onChange={setPlatform}
          options={[
            { value: "iphone", label: "iPhone" },
            { value: "android", label: "Android" },
          ]}
        />
        <SlidingSegment<Client>
          label="Klient"
          value={client}
          onChange={setClient}
          options={[
            { value: "mail", label: "Mail" },
            { value: "gmail", label: "Gmail" },
          ]}
        />
        <SlidingSegment<Theme>
          label="Tema"
          value={theme}
          onChange={setTheme}
          options={[
            { value: "light", label: "Ljus" },
            { value: "dark", label: "Mörk" },
          ]}
        />
      </div>

      <p className="text-center text-[11px] text-zinc-500">{caption}</p>

      <div className="flex justify-center lg:justify-start">
        {client === "mail" ? (
          <AppleMailMock
            sender={sender}
            subject={subject}
            preheader={preheader}
            theme={theme}
            platform={platform === "iphone" ? "ios" : "android"}
            width={
              platform === "iphone"
                ? LAYOUT.iphoneWidthPx
                : LAYOUT.gmailWidthDp
            }
            avatarSize={
              platform === "iphone"
                ? LAYOUT.iosAvatarPx
                : LAYOUT.gmailAvatarPx
            }
            padding={
              platform === "iphone"
                ? LAYOUT.iosHorizontalPaddingPx
                : LAYOUT.gmailHorizontalPaddingPx
            }
            gap={
              platform === "iphone"
                ? LAYOUT.iosAvatarGapPx
                : LAYOUT.gmailAvatarGapPx
            }
            type={platform === "iphone" ? iosType : gmailType}
          />
        ) : (
          <GmailMock
            sender={sender}
            subject={subject}
            preheader={preheader}
            theme={theme}
            width={
              platform === "iphone"
                ? LAYOUT.iphoneWidthPx
                : LAYOUT.gmailWidthDp
            }
            textWidth={
              platform === "iphone"
                ? LAYOUT.iphoneWidthPx -
                  LAYOUT.iosHorizontalPaddingPx * 2 -
                  LAYOUT.gmailAvatarPx -
                  LAYOUT.gmailAvatarGapPx
                : LAYOUT.gmailTextColumnPx
            }
            type={gmailType}
          />
        )}
      </div>
    </div>
  );
}

type TextMetrics = {
  sender: number;
  time: number;
  subject: number;
  preview: number;
};

function AppleMailMock({
  sender,
  subject,
  preheader,
  theme,
  width,
  avatarSize,
  padding,
  gap,
  type,
  platform,
}: {
  sender: string;
  subject: string;
  preheader: string;
  theme: Theme;
  width: number;
  avatarSize: number;
  padding: number;
  gap: number;
  type: TextMetrics;
  platform: "ios" | "android";
}) {
  const dark = theme === "dark";
  const textWidth = width - padding * 2 - avatarSize - gap;
  const labsDemoAvatar = isInboksLabsDemoSender(sender);

  return (
    <div
      className={`mx-auto overflow-hidden rounded-[26px] border border-black/10 shadow-[0_18px_50px_rgba(0,0,0,0.10)] ${
        dark ? "bg-black text-white" : "bg-[#f2f2f7] text-black"
      }`}
      style={{ width, maxWidth: "100%" }}
    >
      <div
        className={`border-b px-4 py-2 text-center font-medium ${
          dark ? "border-white/10 text-zinc-400" : "border-black/5 text-zinc-500"
        }`}
      >
        <span
          style={{
            fontFamily:
              platform === "ios"
                ? 'system-ui, -apple-system, "SF Pro Text", sans-serif'
                : '"Roboto", system-ui, sans-serif',
            fontSize: Math.round(
              11 *
                (platform === "ios"
                  ? type.preview / IOS_BASE_PT.preview
                  : type.preview / GMAIL_BASE_SP.preview),
            ),
          }}
        >
          Inkorg
        </span>
      </div>
      <div className="py-2 pr-4" style={{ paddingLeft: padding }}>
        <div className="flex items-start" style={{ gap }}>
          <div
            className={
              labsDemoAvatar
                ? "flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
                : "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-rose-500 font-semibold text-white"
            }
            style={{
              width: avatarSize,
              height: avatarSize,
              fontSize: Math.max(
                10,
                Math.round(avatarSize * (labsDemoAvatar ? 0.44 : 0.34)),
              ),
              ...(labsDemoAvatar ? { backgroundColor: INBOKSLABS_AVATAR } : {}),
            }}
          >
            {avatarGlyph(sender)}
          </div>
          <div
            className="min-w-0 shrink"
            style={{ width: textWidth, maxWidth: textWidth }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span
                className="truncate font-semibold leading-tight"
                style={{
                  fontFamily:
                    platform === "ios"
                      ? 'system-ui, -apple-system, "SF Pro Text", "SF Pro Display", sans-serif'
                      : '"Roboto", system-ui, sans-serif',
                  fontSize: type.sender,
                  lineHeight: 1.25,
                  letterSpacing: "-0.2px",
                }}
              >
                {sender || "Avsändare"}
              </span>
              <span
                className={`shrink-0 ${dark ? "text-zinc-500" : "text-zinc-500"}`}
                style={{
                  fontFamily:
                    platform === "ios"
                      ? 'system-ui, -apple-system, "SF Pro Text", sans-serif'
                      : '"Roboto", system-ui, sans-serif',
                  fontSize: type.time,
                  lineHeight: 1.2,
                  fontWeight: 400,
                }}
              >
                9:41
              </span>
            </div>
            <p
              className="truncate font-semibold leading-snug"
              style={{
                fontFamily:
                  platform === "ios"
                    ? 'system-ui, -apple-system, "SF Pro Text", sans-serif'
                    : '"Roboto", system-ui, sans-serif',
                fontSize: type.subject,
                lineHeight: 1.26,
                marginTop: 2,
                letterSpacing: "-0.25px",
              }}
            >
              {subject || " "}
            </p>
            <p
              className={`line-clamp-2 leading-snug ${
                dark ? "text-zinc-400" : "text-zinc-500"
              }`}
              style={{
                fontFamily:
                  platform === "ios"
                    ? 'system-ui, -apple-system, "SF Pro Text", sans-serif'
                    : '"Roboto", system-ui, sans-serif',
                fontWeight: 400,
                fontSize: type.preview,
                lineHeight: 1.32,
                marginTop: 1,
              }}
            >
              {preheader || " "}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GmailMock({
  sender,
  subject,
  preheader,
  theme,
  width,
  textWidth,
  type,
}: {
  sender: string;
  subject: string;
  preheader: string;
  theme: Theme;
  width: number;
  textWidth: number;
  type: TextMetrics;
}) {
  const dark = theme === "dark";
  const labsDemoAvatar = isInboksLabsDemoSender(sender);

  return (
    <div
      className={`mx-auto overflow-hidden rounded-[26px] border border-black/10 shadow-[0_18px_50px_rgba(0,0,0,0.10)] ${
        dark ? "bg-[#202124] text-[#e8eaed]" : "bg-white text-[#202124]"
      }`}
      style={{ width, maxWidth: "100%" }}
    >
      <div
        className={`border-b px-4 py-2 text-center font-medium ${
          dark ? "border-[#3c4043] text-[#9aa0a6]" : "border-zinc-200 text-[#5f6368]"
        }`}
      >
        <span
          style={{
            fontFamily: '"Roboto", "Roboto Draft", sans-serif',
            fontSize: Math.round(type.time),
            fontWeight: 500,
          }}
        >
          Primär
        </span>
      </div>
      <div
        className="flex items-start gap-3 py-3 pr-4"
        style={{ paddingLeft: LAYOUT.gmailHorizontalPaddingPx }}
      >
        <div
          className={`flex shrink-0 items-center justify-center rounded-full font-medium text-white ${
            labsDemoAvatar
              ? ""
              : dark
                ? "bg-[#5f6368]"
                : "bg-[#1a73e8]"
          }`}
          style={{
            width: LAYOUT.gmailAvatarPx,
            height: LAYOUT.gmailAvatarPx,
            fontSize: Math.round(13 * (type.subject / GMAIL_BASE_SP.subject)),
            ...(labsDemoAvatar ? { backgroundColor: INBOKSLABS_AVATAR } : {}),
          }}
        >
          {avatarGlyph(sender)}
        </div>
        <div
          className="min-w-0 shrink"
          style={{ width: textWidth, maxWidth: textWidth }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span
              className="truncate"
              style={{
                fontFamily:
                  '"Roboto", "Roboto Draft", "Helvetica Neue", Helvetica, Arial, sans-serif',
                fontWeight: 500,
                fontSize: type.sender,
                lineHeight: 1.35,
                letterSpacing: "0.00625em",
              }}
            >
              {sender || "Avsändare"}
            </span>
            <span
              className={`shrink-0 ${dark ? "text-[#9aa0a6]" : "text-[#5f6368]"}`}
              style={{
                fontFamily: '"Roboto", sans-serif',
                fontWeight: 400,
                fontSize: type.time,
                lineHeight: 1.3,
              }}
            >
              9:41
            </span>
          </div>
          <p
            className="truncate font-medium leading-snug"
            style={{
              fontFamily: '"Roboto", sans-serif',
              fontSize: type.subject,
              lineHeight: 1.4,
              marginTop: 2,
            }}
          >
            {subject || " "}
          </p>
          <p
            className={`line-clamp-2 leading-snug ${
              dark ? "text-[#bdc1c6]" : "text-[#5f6368]"
            }`}
            style={{
              fontFamily: '"Roboto", sans-serif',
              fontWeight: 400,
              fontSize: type.preview,
              lineHeight: 1.45,
              marginTop: 2,
            }}
          >
            {preheader || " "}
          </p>
        </div>
      </div>
    </div>
  );
}

