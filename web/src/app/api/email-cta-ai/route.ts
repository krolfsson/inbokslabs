import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.INBOX_AI_MODEL ?? "gpt-4o-mini";
/** Synlighetsanalys — sätt t.ex. `gpt-4o` om din standardmodell saknar bildstöd. */
const VISION_MODEL = process.env.EMAIL_CTA_VISION_MODEL?.trim() || MODEL;
const EMAIL_HTML_MAX = 24_000;
/** Övre gräns för base64‑data‑URL (~6 MB raw sträng — under Vercel praktiska gränser). */
const SCREENSHOT_BODY_MAX_CHARS = 6_800_000;

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return Response.json(
      {
        error: "NO_KEY",
        message:
          "Sätt OPENAI_API_KEY i miljön (t.ex. Vercel Environment Variables eller web/.env.local).",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const htmlInput = String(o.html ?? "").trim();
  const screenshot = String(o.screenshotDataUrl ?? "").trim();

  const hasImage = /^data:image\/(png|jpeg|webp);base64,/i.test(screenshot);
  if (!htmlInput && !hasImage) {
    return Response.json(
      {
        error: "EMPTY_INPUT",
        message: "Varken HTML eller skärmbild bifogades.",
      },
      { status: 400 },
    );
  }

  if (hasImage && screenshot.length > SCREENSHOT_BODY_MAX_CHARS) {
    return Response.json(
      { error: "SCREENSHOT_TOO_LARGE", message: "Skärmbilden är för stor." },
      { status: 413 },
    );
  }

  const cappedHtml =
    htmlInput.length <= EMAIL_HTML_MAX
      ? htmlInput
      : htmlInput.slice(0, EMAIL_HTML_MAX) +
        `\n\n[…HTML kapad till ${EMAIL_HTML_MAX} tecken…]`;

  type UserPart =
    | { type: "text"; text: string }
    | { type: "image"; image: string };

  const userContent: UserPart[] = [];

  if (hasImage) {
    userContent.push({
      type: "text",
      text: `Bild 1: skärmdump av hur e-posten faktiskt renderas i vår förhands­visning (samma vy som användaren ser).

Identifiera först vilka separata åtgärder som syns; använd bilden för exakt formulering på knapp eller länk där läsbara ord syns.

**Övergripande viktigt:** för varje punkt nedan lägger du tyngdpunkten på **copy** — vad som **står** på CTA:n (orden, ton, tydlighet, verb, nytta, vaghet/konkretion), inte först på grafisk design. Hierarki, yta eller färg bara om det förändrar hur copyn tas emot eller om text kapas.`,
    });
    userContent.push({ type: "image", image: screenshot });
  }

  if (cappedHtml) {
    userContent.push({
      type: "text",
      text: `${hasImage ? "Kompletterande " : ""}normaliserad e-post‑HTML (eventuellt från .eml via klient). Primärt för knapptext/\`title\`/\`aria-label\`/\`alt\` om bilden inte visar orden tydligt. Analys per CTA enligt systeminstruktion:

<<<HTML>>>
${cappedHtml}
<<<SLUT_HTML>>>`,
    });
  }

  const result = streamText({
    model: openai(VISION_MODEL),
    system: `Du granskar kampanj‑e-post för svensk eller nordisk mottagar­kontext (B2B/B2C).

**Primärt mål:** bedöm och resonera kring CTA‑**copy** — det som läses på själva klickytan: knapptext, länktext, synlig etikett, eller (om det är bild‑CTA) den text som i praktiken levereras via \`alt\`/\`title\` i HTML om den bidrar till hur knappen uppfattas.

När skärmdump finns: använd den för att se exakt ordning och **vad som faktiskt står** där kör­texten syns. HTML är stöd för \`href\`, dold \`alt\`, \`aria-label\`, duplicerad markup.

Uppgift: Identifiera varje tydlig CTA (knapp, tydlig textlänk som åtgärd, klickbar bildyta där brukaren förväntar sig handling). Upprepningar med **samma ordalydelse** kan slås ihop till en punkt om de är redundant; om copyn eller kontext skiljer sig — separata punkter.

För svaren: **ca 60–80 % av utrymmet under varje CTA ska handla om språket** (inte om layout/tabell eller generell “conversion design” förutom där layout påverkar hur copyn läses, t.ex. kapning).

Kommentarer ska bland annat beröra om relevant:
- Verb och handling: aktivt eller flummigt (“läs mer” vs konkret nästa steg).
- Återkoppling till värdeerbjudande: stämmer formuleringen med rubrik/brödtext eller känns lösryckt?
- Längd och skanning: för långt för mobil lista? Kan delar inte ses i bild?
- Jargong, säljmanér, eller otydlig destination (vad händer vid klick?).
- Förtroendeton: inte över‑påläst juridiska garantier eller falsk brådska — bedöm för svensk/nordisk mottagar­kultur.
- Flera konkurrerande CTA: om **orden** konkurrerar med varandra eller budskapligen spretar.

Om copy saknas eller bara säger typ “klicka här” utan mål — flagga och förklara kort vad som saknas i formulering.

Regler för svar på svenska:
1. Ingen hälsningsinledning.
2. Inga kandidater: max fem meningar som förklarar.
3. För **varje** CTA (vertikal läsordning):

### CTA n
Rad som börjar med **Synlig copy** (inom citattecken eller tydlig kursiv om det är ett kort utdrag — det exakta eller nära vad mottagaren ser). Vid bild‑CTA utan läsbar text: ange \`alt\` från HTML om det finns, annars “(ingen läsbar knapptext i bilden)”.

Om \`href\` ger tydlig ledtråd till destination: kort mål i parentes om det hjälper copybedömningen.

**Kommentar (copy):** två till fyra meningar med fokus på ordval och budskap. Du får kort ange **riktning** för bättre formulering eller ett **mycket kort alternativ** om det förtydligar — inte en hel kampanj eller långa omformuleringar i rad.

Undvik dominans av ”visuellt sticker ut/kontrast” om det inte knyts till hur texten läses.

4. Ersätter inte juridisk rådgivning.`,
    messages: [{ role: "user", content: userContent }],
  });

  return result.toTextStreamResponse({
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
