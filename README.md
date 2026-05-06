# inbokslabs

inbokslabs pairs a **Next.js** marketing and tools site with a **Go** rendering service:

1. **Inbox lab** (startsida `/`) — ändra avsändare, rubrik och ingress; se iPhone Mail– och Gmail‑rader (ljus/mörk).
2. **Email → PNG** — Go-tjänsten tar emot webbhooks, renderar HTML i Chromium, ramar in telefonen och **svarar med PNG** via SMTP.

## Project layout

| Path | Role |
|------|------|
| `web/` | Next.js 16 (App Router) — NPM-paket **`inbokslabs-web`**; sätt Vercel-root till `web` om du bara importerar den mappen. |
| `services/render/` | Go HTTP + Dockerfile (Chromium + chromedp). Kör på Fly.io, Railway, Render, m.fl. |

## Web app

```bash
cd web
npm install
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000) för startsida (inkorgs- och mejllabbet) och [http://localhost:3000/integritet](http://localhost:3000/integritet) för integritetstext.

## Render service

Miljö (se `services/render/.env.example`):

- **`WEBHOOK_SECRET`** — valfritt; säker header `X-Webhook-Secret`.
- **`SMTP_*`** — för svar med bilaga (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`).
- **`CHROME_BIN`** — valfritt.

Endpoints:

- **`POST /v1/inbound`** — multipart (`body-html`, `sender`, `subject`, …).
- **`POST /v1/render-test`** — JSON `{ "html": "...", "to": "..." }`.
- **`GET /health`**.

### Docker

```bash
cd services/render
docker build -t inbokslabs-render .
docker run --rm -p 8080:8080 \
  -e SMTP_HOST=... -e SMTP_USER=... -e SMTP_PASSWORD=... -e SMTP_FROM="inbokslabs <mockups@...>" \
  inbokslabs-render
```

### Lokal Go

```bash
cd services/render
go mod tidy
go run .
```

## Integritet / kundförtroende

Sidan **`/integritet`** sammanfattar databehov: förhandsHTML och PNG i webbläsaren; bildproxy med **`private, no-store`**; Inkorg‑AI kan skicka texter till OpenAI när nyckeln är satt.

## Notes

- Renders är **approximationer**: använd inbokslabs för fart, sedan Litmus/enheter för QA.
- Mycket stora HTML-last mot `data:`-URL kan begränsas i Chrome; byt navigation i `render.go` vid behov.
