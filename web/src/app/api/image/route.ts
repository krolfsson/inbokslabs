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
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(target.protocol)) {
    return NextResponse.json({ error: "Unsupported protocol" }, { status: 400 });
  }

  if (isPrivateHost(target.hostname)) {
    return NextResponse.json({ error: "Unsupported host" }, { status: 400 });
  }

  const upstream = await fetch(target, {
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Lithmuth/1.0",
    },
    redirect: "follow",
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: "Image fetch failed" },
      { status: upstream.status || 502 },
    );
  }

  const contentType = upstream.headers.get("content-type") || "image/png";
  if (!contentType.toLowerCase().startsWith("image/")) {
    return NextResponse.json({ error: "Not an image" }, { status: 415 });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
