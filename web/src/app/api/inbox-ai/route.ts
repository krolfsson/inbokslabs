import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.INBOX_AI_MODEL ?? "gpt-4o-mini";

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
  const sender = String(o.sender ?? "").trim().slice(0, 120);
  const subject = String(o.subject ?? "").trim().slice(0, 400);
  const preheader = String(o.preheader ?? "").trim().slice(0, 600);

  const result = streamText({
    model: openai(MODEL),
    system: `Du är en senior e-postmarknadsförare med fokus på svenska mottagare (B2B och B2C), GDPR, svensk marknadsföringspraxis och typiska beteenden i Apple Mail, Gmail och Android-klienter.

Din uppgift: bedöm hur stark *öppningspotentialen* är för kombinationen rubrik + ingress (preheader), givet avsändarens visningsnamn.

Regler för ditt svar:
1. Första raden ska UTTRYCKLIGEN och ENSAM på raden vara exakt formatet: POÄNG: <heltal 0-100> (ingen annan text på den raden).
2. Sedan en tom rad.
3. Därefter 3–7 korta stycken eller punktlistor på svenska: konkret feedback, vad som funkar för svensk målgrupp, mobilkapning/radbyte, tonalitet (formell/informell), risk för spam/filter, förhållning till ingressens roll vs rubriken, samt ett par förbättringsförslag om det behövs.
4. Gissa inte ett exakt mätvärde från verkliga utskick — det här är en professionell bedömning, inte ett CRM-mått.
5. Håll dig till innehållet ovan; ingen inledning som "här kommer analys".`,
    prompt: `Avsändare (visningsnamn): ${sender || "(tom)"}

Rubrik:
${subject || "(tom)"}

Ingress (preheader):
${preheader || "(tom)"}`,
  });

  return result.toTextStreamResponse({
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
