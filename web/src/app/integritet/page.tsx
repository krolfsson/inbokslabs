import Link from "next/link";
import type { Metadata } from "next";
import { InboksLabsWordmark } from "@/components/InboksLabsLogo";

export const metadata: Metadata = {
  title: "Integritet & data",
  description:
    "Hur inbokslabs hanterar förhandsvisning, e‑post‑HTML och AI.",
};

export default function IntegritetPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <InboksLabsWordmark href="/" className="-ml-px" />
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-brand-deep sm:text-4xl">
        Integritet & data
      </h1>
      <p className="mt-4 text-base leading-relaxed text-zinc-600">
        Här beskriver vi hur verktyget fungerar tekniskt, så att du och era kunder kan bedömma
        risken. Vi strävar efter att inte göra verktyget till ett nytt datalager för er kampanj.
      </p>

      <section className="mt-10 space-y-4 text-[15px] leading-relaxed text-zinc-700">
        <h2 className="text-lg font-semibold text-brand-deep">
          Inkorgsförhandsvisning (fliken Inkorg)
        </h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Avsändarnamn, ämnesrad och ingress finns i sidans minne i webbläsaren (React‑state).
            Vi använder inte localStorage eller liknande beständigt lagrade cookies för den här
            texten i den nuvarande implementationen.
          </li>
          <li>
            När AI‑bedömning av öppningspotential är aktiverad (API‑nyckel konfigurerad) skickas{" "}
            <strong>endast</strong> avsändarnamn, ämnesrad och ingress till vår backend på Vercel och
            vidare till OpenAI enligt deras villkor. För den funktionen lämnar alltså texten
            webbläsaren — men <strong>hela e‑post‑HTML skickas inte</strong> i det flödet.
          </li>
          <li>
            Svar från AI strömmas till klienten med <code className="rounded bg-brand-tint/80 px-1 py-px text-[13px] text-brand-deep">no-store</code> och
            sparas inte i en separat databas i appen i dag.
          </li>
        </ul>
      </section>

      <section className="mt-10 space-y-4 text-[15px] leading-relaxed text-zinc-700">
        <h2 className="text-lg font-semibold text-brand-deep">
          E‑post förhandsvisa &amp; PNG (fliken E‑post)
        </h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            HTML som du klistrar in eller laddar upp läses till webbläsaren och bearbetas där (parse,
            säkerhetsfilter för visning).
          </li>
          <li>
            Om du använder AI‑granskning av CTA skapas i webbläsaren en rasteriserad bild av
            förhandsutkastet (samma vy som du ser bredvid textfältet) samt ett trunkerat utdrag av
            normaliserad HTML/.eml. Materialet skickas till en separat backend‑endpoint och vidare till
            OpenAI för syn‑inriktad bedömning. Inga
            kampanj­kopior arkiveras i verktygets standardimplementation.
          </li>
          <li>
            Kommandot för <strong>Spara PNG</strong> rasteriserar förhandsvisningen i webbläsaren
            och laddar ner en fil lokalt — PNG‑blobben skickas inte till oss för arkivering.
          </li>
          <li>
            Externa bilder (<code className="rounded bg-brand-tint/80 px-1 py-px text-[13px] text-brand-deep">https://…</code>) måste hämtas någonstans för att visas;
            förhandsvisningen använder därför ett API som proxar bilden åt klienten. Vi sätter
            svarsheaders så svaret inte ska mellanlagras som en delad CDN‑cachenyckel i onödan. Det
            räcker ändå inte som juridisk &quot;nollrisk&quot;: er leverantör (t.ex. Vercel)
            kan enligt sina rutiner för loggning eller abuse‑skydd se trafiken kortlivat.
          </li>
          <li>
            Inlänkade resurser (t.ex. spårningspixel‑URL:er om de finns i HTML) kan fortfarande
            trigga förfrågan direkt till den adress ni pekat på — då gäller{" "}
            <em>dera</em> loggning, inte den här tjänstens.
          </li>
        </ul>
      </section>

      <section className="mt-10 space-y-4 text-[15px] leading-relaxed text-zinc-700">
        <h2 className="text-lg font-semibold text-brand-deep">E‑post → PNG (skicka mail till er)</h2>
        <p>
          Den separata Go‑tjänsten tar emot inkommande webbhooks, renderar HTML i minnet och kan
          svara med bilaga. Ingen varaktig fil‑databas ingår i det flödet som standard, men server
          och e‑postleverantör kan ha egna loggar; se er driftsättning.
        </p>
      </section>

      <section className="mt-10 space-y-4 text-[15px] leading-relaxed text-zinc-700">
        <h2 className="text-lg font-semibold text-brand-deep">Hur ni gör det extra pålitligt</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Använd <strong>klient-side</strong> för HTML + PNG (som webbappen gör) och undvik att
            skicka rå HTML till er backend om ni inte måste.
          </li>
          <li>
            Stäng av eller separat märk AI‑funktionen om kunden inte vill att rubrik, ingress eller
            utkasts‑HTML skickas till en tredjepartsmodell.
          </li>
          <li>
            Erbjud self‑hosting eller separat Vercel‑projekt under ert konto så att kunden vet var
            trafiken landar.
          </li>
          <li>
            Publicera den här sidan och eventuellt ett kort DPA med er leverantörskedja (Vercel,
            OpenAI, ev. flygbolag för render‑tjänsten).
          </li>
        </ul>
      </section>

      <p className="mt-12 text-sm text-zinc-500">
        <Link href="/" className="text-brand underline decoration-brand/35 hover:text-brand-deep hover:decoration-brand-deep/50">
          Tillbaka till startsidan
        </Link>
      </p>
    </main>
  );
}
