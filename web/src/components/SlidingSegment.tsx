"use client";

import type {
  ButtonHTMLAttributes,
  CSSProperties,
  ReactNode,
} from "react";

export const SLIDE_MS = 680;
export const SLIDE_TIMING_CSS = "cubic-bezier(0.25, 0.76, 0.25, 0.94)";

type Opt<T extends string> = Readonly<{ value: T; label: string }>;

type BaseProps<T extends string> = {
  value: T;
  onChange: (v: T) => void;
  options: readonly [Opt<T>, Opt<T>];
  trackClassName?: string;
  thumbClassName?: string;
  activeTextClassName?: string;
  inactiveTextClassName?: string;
  inactiveHoverClassName?: string;
  size?: "sm" | "md";
  tablistAttrs?: { role?: "tablist"; "aria-label"?: string };
  /** T.ex. role="tab", id, aria-controls */
  buttonProps?: (
    option: Opt<T>,
    active: boolean,
  ) => Partial<
    Pick<
      ButtonHTMLAttributes<HTMLButtonElement>,
      "id" | "role" | "aria-selected" | "aria-controls"
    >
  >;
};

function SlidingTrack<T extends string>({
  value,
  onChange,
  options,
  trackClassName,
  thumbClassName,
  activeTextClassName,
  inactiveTextClassName,
  inactiveHoverClassName,
  size = "sm",
  tablistAttrs,
  buttonProps,
}: BaseProps<T>) {
  const activeIndex =
    Math.max(
      0,
      options.findIndex((o) => o.value === value),
    ) % 2;

  const btn =
    size === "md"
      ? "rounded-full px-4 py-2 text-sm"
      : "rounded-full px-2.5 py-1.5 text-[11px]";

  return (
    <div className={`relative rounded-full p-1 ${trackClassName ?? ""}`}>
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full ${thumbClassName ?? ""}`}
        style={{
          transition: `transform ${SLIDE_MS}ms ${SLIDE_TIMING_CSS}`,
          transform: `translateX(calc(${activeIndex} * (100% + 4px)))`,
        }}
      />
      <div className="relative z-[1] grid grid-cols-2 gap-0" {...tablistAttrs}>
        {options.map((o) => {
          const active = o.value === value;
          const extra = buttonProps?.(o, active) ?? {};
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={`${btn} transition-colors duration-300 ease-out ${active ? activeTextClassName ?? "" : `${inactiveTextClassName ?? ""} ${inactiveHoverClassName ?? ""}`}`}
              {...extra}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Enhet / klient / tema */
export function SlidingSegment<T extends string>(props: BaseProps<T> & { label: string }) {
  const {
    label,
    value,
    onChange,
    options,
    trackClassName = "bg-zinc-100",
    thumbClassName = "bg-white shadow-sm",
    activeTextClassName = "font-semibold text-zinc-950",
    inactiveTextClassName = "font-medium text-zinc-500",
    inactiveHoverClassName = "hover:text-zinc-700",
    size = "sm",
  } = props;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <div role="group" aria-label={label}>
        <SlidingTrack<T>
          value={value}
          onChange={onChange}
          options={options}
          trackClassName={trackClassName}
          thumbClassName={thumbClassName}
          activeTextClassName={activeTextClassName}
          inactiveTextClassName={inactiveTextClassName}
          inactiveHoverClassName={inactiveHoverClassName}
          size={size}
        />
      </div>
    </div>
  );
}

const PANEL_IDS = ["panel-preview-inbox", "panel-preview-email"] as const;

/** Inkorg / E-post högst upp i arbetsytan */
export function SlidingWorkbenchTabs<T extends string>({
  value,
  onChange,
  options,
}: Pick<BaseProps<T>, "value" | "onChange" | "options">) {
  return (
    <SlidingTrack<T>
      value={value}
      onChange={onChange}
      options={options}
      size="md"
      trackClassName="mx-auto w-full max-w-xs bg-white/95 shadow-inner ring-1 ring-brand/12"
      thumbClassName="bg-brand shadow-[0_3px_16px_rgba(79,70,229,0.28)]"
      activeTextClassName="font-semibold text-white"
      inactiveTextClassName="font-medium text-zinc-600"
      inactiveHoverClassName="hover:text-brand"
      tablistAttrs={{
        role: "tablist",
        "aria-label": "Läge: inkorg eller e-post",
      }}
      buttonProps={(o, active) => {
        const i = Math.max(
          0,
          options.findIndex((x) => x.value === o.value),
        ) as 0 | 1;
        return {
          role: "tab",
          "aria-selected": active,
          id: `tab-${o.value}`,
          "aria-controls": PANEL_IDS[i],
        };
      }}
    />
  );
}

/** Panel-id som hör ihop med tabbar (aria-controls). */
export function previewWorkbenchTabPanelId(index: 0 | 1): string {
  return PANEL_IDS[index];
}

/**
 * Slide mellan två paneler (~680 ms). Barnen ska ges fast breddrad (50 % av slidens 200 % bred).
 */
export function SlidePanels({
  activeIndex,
  className,
  children,
}: {
  activeIndex: 0 | 1;
  className?: string;
  /** [panel0, panel1] */
  children: [ReactNode, ReactNode];
}) {
  const pct = -(activeIndex * 50);
  return (
    <div className={`overflow-hidden ${className ?? ""}`}>
      <div
        className="flex w-[200%]"
        style={
          {
            transition: `transform ${SLIDE_MS}ms ${SLIDE_TIMING_CSS}`,
            transform: `translateX(${pct}%)`,
          } as CSSProperties
        }
      >
        <div className="relative w-[50%] min-w-0 shrink-0">{children[0]}</div>
        <div className="relative w-[50%] min-w-0 shrink-0">{children[1]}</div>
      </div>
    </div>
  );
}
