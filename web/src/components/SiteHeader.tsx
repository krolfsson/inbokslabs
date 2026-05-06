import Link from "next/link";

const links = [
  { href: "/preview", label: "Inbox lab" },
  { href: "/#mockup", label: "Email → mockup" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/90 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1320px] items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="font-semibold tracking-tight text-zinc-900"
        >
          Lithmuth
        </Link>
        <nav className="flex items-center gap-6 text-sm text-zinc-600">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="transition hover:text-zinc-900"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
