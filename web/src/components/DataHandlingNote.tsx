import Link from "next/link";

type Variant = "email-html" | "inbox";

/**
 * Kort, tekniskt korrekt information om hur kunddata hanteras (länk till /integritet).
 */
export function DataHandlingNote({ variant }: { variant: Variant }) {
  if (variant === "email-html") {
    return (
      <div className="rounded-2xl border border-brand/15 bg-white/80 px-4 py-3 text-[13px] leading-relaxed text-zinc-600">
        <p className="font-medium text-brand-deep">Din e-post lagras inte hos oss</p>
        <p className="mt-1.5">
          HTML och uppladdade filer bearbetas i din webbläsare. PNG för nedladdning skapas lokalt — inget
          innehåll sparas i arkiv av tjänsten. Vid AI‑kopplad CTA‑granskning skickas en{" "}
          <strong>PNG av den renderade förhands­visningen</strong> samt trunkerad källa‑HTML till samma
          backend (se <Link href="/integritet" className="font-medium text-brand underline decoration-brand/30 underline-offset-2">Integritet</Link>).
        </p>
        <p className="mt-1.5">
          Externa bilder i förhands­­visningen går via vår proxy som vidarebefordrar dem utan att
          spara dem i databas.
        </p>
        <p className="mt-2">
          <Link
            href="/integritet"
            className="font-medium text-brand underline decoration-brand/30 underline-offset-2 hover:text-brand-deep hover:decoration-brand-deep/50"
          >
            Integritet & data (fullständig förklaring)
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand/15 bg-white/80 px-4 py-3 text-[13px] leading-relaxed text-zinc-600">
      <p className="font-medium text-brand-deep">Rubrik och ingress</p>
      <p className="mt-1.5">
        Fälten finns bara i din webbläsare tills du laddar om sidan. När AI-analys är
        aktiverad skickas avsändarnamn, ämnesrad och ingress till vår API‑route och vidare till
        OpenAI för bedömning — inte hela kampanj‑HTML. CTA‑analys för inklistrad HTML eller .eml
        görs på fliken E‑post och skickas därifrån separat när analysen är påslagen.
      </p>
      <p className="mt-2">
        <Link
          href="/integritet"
          className="font-medium text-brand underline decoration-brand/30 underline-offset-2 hover:text-brand-deep hover:decoration-brand-deep/50"
        >
          Läs mer under Integritet & data
        </Link>
      </p>
    </div>
  );
}
