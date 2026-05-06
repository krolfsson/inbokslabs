/**
 * Heuristic “open potential” for subject + preheader (Swedish / Nordic context).
 * This is not a forecast — only a checklist-style score from common best practices.
 */

export type OpenPotentialBand = "low" | "medium" | "high";

export type OpenPotentialSignal = {
  /** Impact on the 0–100 score (can be negative). */
  delta: number;
  /** Short label for UI. */
  label: string;
};

export type SwedishOpenPotential = {
  percent: number;
  band: OpenPotentialBand;
  signals: OpenPotentialSignal[];
};

const SPAMMY_SV = [
  /\bgratis\b/i,
  /\b100\s*%\b/,
  /\btjäna\s+pen/i,
  /\bakt\s*nu\b/i,
  /\binga\s+kost/i,
  /\bbekräfta\s+ditt\s+konto/i,
  /\bklicka\s+här\b/i,
  /\bbegänsat\s+erbjud/i,
  /\blås\s+upp\b/i,
  /\bdu\s+har\s+vin/i,
];

const SPAMMY_EN = [
  /\bfree\b/i,
  /\bclick\s+here\b/i,
  /\bact\s+now\b/i,
  /\blimited\s+time\b/i,
  /\byou('ve|'ve|\s+have)\s+won\b/i,
  /\bviagra\b/i,
  /\bcrypto\b/i,
];

/** Synthetic thread prefixes sometimes used clickbait-style (illegal/misleading in EU marketing context). */
const MISLEADING = /^\s*(re|fwd|sv)\s*:\s*/i;

function bandFor(percent: number): OpenPotentialBand {
  if (percent >= 72) return "high";
  if (percent >= 45) return "medium";
  return "low";
}

function wordOverlapRatio(a: string, b: string): number {
  const tokenize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1);
  const wa = tokenize(a);
  const wb = tokenize(b);
  if (!wa.length || !wb.length) return 0;
  const sb = new Set(wb);
  let inter = 0;
  for (const w of wa) if (sb.has(w)) inter += 1;
  return inter / Math.max(wa.length, wb.length);
}

function subjectLengthScore(len: number): { score: number; label: string } {
  if (len === 0) return { score: 0, label: "Rubrik saknas." };
  if (len <= 20)
    return { score: 10, label: "Rubrik ganska kort — mer kontext kan öka nyfikenhet." };
  if (len <= 28)
    return { score: 16, label: "Rubrik kort men okej på mobil." };
  if (len <= 48)
    return { score: 22, label: "Rubriklängd i linje med bra mobilvisning i Sverige." };
  if (len <= 68)
    return { score: 15, label: "Rubriken riskerar att kapas på många mobiler." };
  return { score: 8, label: "Mycket lång rubrik — mycket kapas bort i inkorgen." };
}

function preheaderScore(
  pre: string,
  subj: string,
): { score: number; label: string } {
  const len = pre.trim().length;
  if (len === 0) {
    if (subj.trim().length === 0) return { score: 0, label: "Ingen ingress." };
    return {
      score: 6,
      label: "Tom ingress — du tappar ofta en andra chans att förklara värdet.",
    };
  }
  if (len < 18)
    return {
      score: 10,
      label: "Kort ingress — fyll gärna ut med nyttig detalj (inte bara upprepning).",
    };
  if (len <= 130)
    return {
      score: 20,
      label: "Ingresslängd som ofta syns bra under rubriken.",
    };
  return {
    score: 14,
    label: "Lång ingress — det mesta syns ändå inte; prioritera början.",
  };
}

function senderScore(sender: string): { score: number; label: string } {
  const t = sender.trim();
  if (!t) return { score: 0, label: "Avsändare tom — igenkänning påverkar öppning." };
  if (t.length > 42)
    return {
      score: 5,
      label: "Långt avsändarnamn — kan kapas och bli otydligt.",
    };
  return { score: 8, label: "Avsändare angiven — bra för förtroende." };
}

/**
 * Returns a 0–100 score with short explanations (Swedish copy).
 */
export function computeSwedishOpenPotential(input: {
  subject: string;
  preheader: string;
  sender: string;
}): SwedishOpenPotential {
  const subject = input.subject.trim();
  const preheader = input.preheader.trim();
  const sender = input.sender.trim();

  const signals: OpenPotentialSignal[] = [];
  let raw = 0;

  const sl = subjectLengthScore(subject.length);
  raw += sl.score;
  signals.push({ delta: sl.score, label: sl.label });

  const ph = preheaderScore(preheader, subject);
  raw += ph.score;
  signals.push({ delta: ph.score, label: ph.label });

  const sn = senderScore(sender);
  raw += sn.score;
  signals.push({ delta: sn.score, label: sn.label });

  const overlap = wordOverlapRatio(subject, preheader);
  if (subject.length > 0 && preheader.length > 0 && overlap > 0.72) {
    const d = -10;
    raw += d;
    signals.push({
      delta: d,
      label: "Ingress upprepar rubriken — lägg till ny information i stället.",
    });
  } else if (subject.length > 0 && preheader.length > 0 && overlap < 0.25) {
    const d = 6;
    raw += d;
    signals.push({
      delta: d,
      label: "Ingress kompletterar rubriken — bra kombination.",
    });
  }

  const subjSingleLine = subject.replace(/\s+/g, " ");
  const letters = subjSingleLine.replace(/[^a-zA-ZåäöÅÄÖ]/g, "");
  const isAllCaps =
    letters.length >= 6 &&
    letters === letters.toUpperCase() &&
    letters !== letters.toLowerCase();
  if (isAllCaps) {
    const d = -12;
    raw += d;
    signals.push({
      delta: d,
      label: "Versaler i hela rubriken — upplevs ofta som skrikiga (särskilt i B2B i Norden).",
    });
  }

  const bangs = (subject.match(/!/g) ?? []).length;
  if (bangs >= 2) {
    const d = -8;
    raw += d;
    signals.push({
      delta: d,
      label: "Flera utropstecken — ofta kopplat till lägre förtroende.",
    });
  }

  if (MISLEADING.test(subject.trim())) {
    const d = -14;
    raw += d;
    signals.push({
      delta: d,
      label: "Misstänkt Re:/Fwd:-start — kan kännas vilseledande (GDPR/marknadsrätt).",
    });
  }

  for (const re of SPAMMY_SV) {
    if (re.test(subject) || re.test(preheader)) {
      const d = -10;
      raw += d;
      signals.push({
        delta: d,
        label: "Ord som ofta väcker skräppostfilter eller misstro i svenska inkorgar.",
      });
      break;
    }
  }
  for (const re of SPAMMY_EN) {
    if (re.test(subject) || re.test(preheader)) {
      const d = -8;
      raw += d;
      signals.push({
        delta: d,
        label: "Engelska “spam-ord” — riskabelt om målgruppen förväntar sig svenska.",
      });
      break;
    }
  }

  if (/\?\s*$/.test(subject) && subject.length >= 12) {
    const d = 4;
    raw += d;
    signals.push({
      delta: d,
      label: "Frågeform kan öka nyfikenhet om den känns ärlig (inte klickbete).",
    });
  }

  if (/\d/.test(subject)) {
    const d = 3;
    raw += d;
    signals.push({
      delta: d,
      label: "Konkret siffra i rubriken — ofta tydligare än fluff.",
    });
  }

  if (/\{\{\s*\w+\s*\}\}/.test(subject + preheader) || /\bh[ea]j\s+[A-ZÅÄÖ][a-zåäö]+\b/i.test(subject + preheader)) {
    const d = 4;
    raw += d;
    signals.push({
      delta: d,
      label: "Personaliseringsyta — bra om data är korrekt (annars motsatt effekt).",
    });
  }

  const emojiCount = [...(subject + preheader).matchAll(/\p{Extended_Pictographic}/gu)].length;
  if (emojiCount === 1) {
    const d = 2;
    raw += d;
    signals.push({
      delta: d,
      label: "En emoji kan sticka ut i svensk B2C — sparsamt bruk brukar funka bäst.",
    });
  } else if (emojiCount >= 4) {
    const d = -6;
    raw += d;
    signals.push({
      delta: d,
      label: "Många emojis — risk att upplevas barnsligt eller “kampanjigt”.",
    });
  }

  const percent = Math.max(0, Math.min(100, Math.round(raw)));
  const band = bandFor(percent);

  signals.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return { percent, band, signals };
}
