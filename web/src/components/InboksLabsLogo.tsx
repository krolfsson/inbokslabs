import Link from "next/link";

/**
 * Ren wordmark som matchar resten av gränssnittet.
 */
export function InboksLabsWordmark({
  className = "",
  href,
}: {
  className?: string;
  /** Om satt rendreras som länk */
  href?: string;
}) {
  const mark = (
    <span
      className={`inline-flex select-none items-baseline font-sans text-[1.55rem] font-semibold leading-none tracking-[-0.045em] text-brand sm:text-[1.85rem] md:text-[2rem] ${className}`}
      lang="sv"
    >
      inbokslabs
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex no-underline outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-4"
      >
        {mark}
      </Link>
    );
  }

  return mark;
}
