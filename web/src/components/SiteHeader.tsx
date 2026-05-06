import Link from "next/link";

const links = [
  { href: "/preview", label: "Inbox lab" },
  { href: "/#mockup", label: "Email → mockup" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#06060a]/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="font-semibold tracking-tight text-white"
        >
          Lithmuth
        </Link>
        <nav className="flex items-center gap-6 text-sm text-zinc-300">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="transition hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
