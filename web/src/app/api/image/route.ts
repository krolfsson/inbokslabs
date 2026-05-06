import { NextResponse } from "next/server";

export const runtime = "nodejs";

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h.endsWith(".local")
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("url");

  if (!raw) {
    return NextResponse.json({ error: "Saknar URL-parameter url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Ogiltig URL" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(target.protocol)) {
    return NextResponse.json(
      { error: "Protokoll stöds inte (krävs http eller https)" },
      { status: 400 },
    );
  }

  if (isPrivateHost(target.hostname)) {
    return NextResponse.json(
      { error: "Den här värdtypen är inte tillåten" },
      { status: 400 },
    );
  }

  const upstream = await fetch(target, {
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Inbokslabs-Preview/1.0",
    },
    redirect: "follow",
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: "Kunde inte hämta bilden" },
      { status: upstream.status || 502 },
    );
  }

  const contentType = upstream.headers.get("content-type") || "image/png";
  if (!contentType.toLowerCase().startsWith("image/")) {
    return NextResponse.json({ error: "Svaret är inte en bild" }, { status: 415 });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      // Undvik delad CDN-lagring av kunders kampanjbilder; proxy trafikerar vid behov om.
      "Cache-Control":
        "private, no-store, max-age=0, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
