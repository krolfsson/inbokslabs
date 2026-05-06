/**
 * Reference layout + typography for inbox list mockups.
 *
 * iOS: Matches a **Mail** three-line list cell on a **390×844 pt** canvas (iPhone 14/15 base width).
 * Horizontal insets align with typical Mail: 16 pt leading/trailing; 32×32 pt avatar; 12 pt gap.
 * Text column width = 390 − 32 − 32 − 12 = 314 pt (same as CSS px at 1×).
 *
 * Type scale follows **Dynamic Type** size-category multipliers applied to Apple’s default
 * *Large* metrics (see “Dynamic Type Sizes” — ratios vs Large for body-style usage).
 * Base pt sizes approximate Mail’s list: sender **subheadline** (~15 pt), time **footnote** (~13 pt),
 * subject emphasized **body** (~17 pt), preview **subheadline** (~15 pt).
 *
 * Android (Gmail): Reference **360 dp** wide content (common Material breakpoint). Insets 16 dp;
 * 40 dp avatar; 12 dp gap → text column 276 dp. Typography **14 sp** primary / secondary lines,
 * **12 sp** meta — scaled with system **fontScale** presets (not identical to iOS; real devices differ).
 *
 * Truncation in real apps is **glyph- and width-based**, not a fixed character count — we never cap
 * strings; ellipsis comes from CSS at these fixed widths.
 */

export type TextSizePreset =
  | "xSmall"
  | "small"
  | "medium"
  | "large"
  | "xLarge"
  | "xxLarge"
  | "xxxLarge";

/** Etiketter i gränssnittet (iOS Dynamisk textstorlek · Android-teckenskala). */
export const TEXT_SIZE_OPTIONS: {
  value: TextSizePreset;
  label: string;
  description: string;
}[] = [
  {
    value: "xSmall",
    label: "Extra liten",
    description: "iOS XS-kategori · Android-teckenskala ~0,85×",
  },
  {
    value: "small",
    label: "Liten",
    description: "iOS S · ~0,88×",
  },
  {
    value: "medium",
    label: "Mellan",
    description: "iOS M · ~0,94×",
  },
  {
    value: "large",
    label: "Standard",
    description: "iOS Large (systemstandard) · Android 1,0×",
  },
  {
    value: "xLarge",
    label: "Stor",
    description: "iOS XL · Android ~1,15×",
  },
  {
    value: "xxLarge",
    label: "Extra stor",
    description: "iOS XXL · Android ~1,3×",
  },
  {
    value: "xxxLarge",
    label: "3XL · tillgänglighet",
    description: "iOS XXXL · Android ~1,45×",
  },
];

/**
 * Dynamic Type: approximate scale vs **Large** from Apple’s text-style size tables.
 * (Uniform multiplier applied to list-specific base pt sizes.)
 */
const IOS_DT_MULTIPLIER: Record<TextSizePreset, number> = {
  xSmall: 0.823,
  small: 0.882,
  medium: 0.941,
  large: 1,
  xLarge: 1.118,
  xxLarge: 1.235,
  xxxLarge: 1.353,
};

/** Android `configuration.fontScale`–style presets (common OS + Gmail behavior). */
const ANDROID_FONT_SCALE: Record<TextSizePreset, number> = {
  xSmall: 0.85,
  small: 0.92,
  medium: 0.96,
  large: 1,
  xLarge: 1.15,
  xxLarge: 1.3,
  xxxLarge: 1.45,
};

/** Base sizes at “Large” / 1.0× for iOS Mail–style row (pt = CSS px here). */
export const IOS_BASE_PT = {
  sender: 15,
  time: 13,
  subject: 17,
  preview: 15,
} as const;

/** Base sp → px at 1.0 fontScale for Gmail-style row. */
export const GMAIL_BASE_SP = {
  sender: 14,
  time: 12,
  subject: 14,
  preview: 14,
} as const;

const IOS_CANVAS = 390;
const IOS_PAD = 16;
const IOS_AV = 32;
const IOS_GAP = 12;

const GMAIL_W = 360;
const GMAIL_PAD = 16;
const GMAIL_AV = 40;
const GMAIL_GAP = 12;

export const LAYOUT = {
  /** Logical canvas width for Mail column math (pt). */
  iphoneWidthPx: IOS_CANVAS,
  iosHorizontalPaddingPx: IOS_PAD,
  iosAvatarPx: IOS_AV,
  iosAvatarGapPx: IOS_GAP,
  /** Text block width: canvas − leading − trailing − avatar − gap. */
  iosTextColumnPx: IOS_CANVAS - IOS_PAD * 2 - IOS_AV - IOS_GAP,

  gmailWidthDp: GMAIL_W,
  gmailHorizontalPaddingPx: GMAIL_PAD,
  gmailAvatarPx: GMAIL_AV,
  gmailAvatarGapPx: GMAIL_GAP,
  gmailTextColumnPx: GMAIL_W - GMAIL_PAD * 2 - GMAIL_AV - GMAIL_GAP,
} as const;

/** Ordered presets for the text-size control (7 discrete stops). */
export const TEXT_SIZE_PRESET_ORDER: TextSizePreset[] = [
  "xSmall",
  "small",
  "medium",
  "large",
  "xLarge",
  "xxLarge",
  "xxxLarge",
];

/** Last step index (0-based). */
export const TEXT_SIZE_STEP_MAX = TEXT_SIZE_PRESET_ORDER.length - 1;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Short labels for ticks under the slider (7 stops; last = xxxLarge). */
export const TEXT_SIZE_STEP_SHORT: readonly string[] = [
  "XS",
  "S",
  "M",
  "Std",
  "L",
  "XL",
  "3XL",
];

/**
 * Multipliers at a discrete step `0 … TEXT_SIZE_STEP_MAX` (one preset per step, no blending).
 */
export function scalesAtStep(step: number): { ios: number; android: number } {
  const i = Math.min(
    TEXT_SIZE_STEP_MAX,
    Math.max(0, Math.round(step)),
  );
  const p = TEXT_SIZE_PRESET_ORDER[i];
  return {
    ios: IOS_DT_MULTIPLIER[p],
    android: ANDROID_FONT_SCALE[p],
  };
}

export function labelAtStep(step: number): string {
  const i = Math.min(
    TEXT_SIZE_STEP_MAX,
    Math.max(0, Math.round(step)),
  );
  const preset = TEXT_SIZE_PRESET_ORDER[i];
  const row = TEXT_SIZE_OPTIONS.find((o) => o.value === preset);
  return row?.label ?? "Standard";
}

/**
 * Smoothly interpolates iOS Dynamic Type–style and Android font-scale multipliers
 * from a 0–100 slider (0 = smallest, 100 = largest preset).
 */
export function scalesFromSlider(value0to100: number): {
  ios: number;
  android: number;
} {
  const v = Math.min(100, Math.max(0, value0to100));
  const segments = TEXT_SIZE_PRESET_ORDER.length - 1;
  const x = (v / 100) * segments;
  const lo = Math.min(segments, Math.floor(x));
  const hi = Math.min(segments, Math.ceil(x));
  const t = hi === lo ? 0 : x - lo;
  const pLo = TEXT_SIZE_PRESET_ORDER[lo];
  const pHi = TEXT_SIZE_PRESET_ORDER[hi];
  return {
    ios: lerp(IOS_DT_MULTIPLIER[pLo], IOS_DT_MULTIPLIER[pHi], t),
    android: lerp(ANDROID_FONT_SCALE[pLo], ANDROID_FONT_SCALE[pHi], t),
  };
}

export function iosTypeScale(preset: TextSizePreset): number {
  return IOS_DT_MULTIPLIER[preset];
}

export function androidFontScale(preset: TextSizePreset): number {
  return ANDROID_FONT_SCALE[preset];
}
