# Lithmuth

Lithmuth pairs a **Next.js** marketing and tools site with a **Go** rendering service:

1. **Inbox lab** (`/preview` on the web app) — edit sender, subject, and preheader; see iPhone Mail–style and Gmail-style inbox rows (light/dark).
2. **Email → PNG** — the Go service accepts inbound mail webhooks, renders HTML in headless Chromium at phone width, composites a phone frame, and **replies** with a PNG attachment over SMTP.

## Project layout

| Path | Role |
|------|------|
| `web/` | Next.js 16 (App Router) — deploy to [Vercel](https://vercel.com); set the project root to `web` or import the `web` folder only. |
| `services/render/` | Go HTTP service + Dockerfile (Chromium + chromedp). Run on Fly.io, Railway, Render, etc. |

## Web app

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the landing page and [http://localhost:3000/preview](http://localhost:3000/preview) for the inbox lab.

## Render service

Configure environment (see `services/render/.env.example`):

- **`WEBHOOK_SECRET`** — optional; when set, requests must include header `X-Webhook-Secret: <value>`.
- **`SMTP_*`** — required for replying with attachments (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`).
- **`CHROME_BIN`** — optional; defaults to common paths and `/usr/bin/chromium` in Docker.

Endpoints:

- **`POST /v1/inbound`** — multipart form fields like `body-html`, `body-plain`, `sender`, `subject` (compatible with common inbound mail parsers).
- **`POST /v1/render-test`** — JSON `{ "html": "<div>...</div>", "to": "you@example.com" }`; returns PNG bytes for quick validation (optional `to` + SMTP to also email).
- **`GET /health`** — JSON health check.

### Docker

```bash
cd services/render
docker build -t lithmuth-render .
docker run --rm -p 8080:8080 \
  -e SMTP_HOST=... -e SMTP_USER=... -e SMTP_PASSWORD=... -e SMTP_FROM="Lithmuth <mockups@...>" \
  lithmuth-render
```

### Local Go build

Requires Go ≥ 1.22 and a local Chrome/Chromium (set `CHROME_BIN` if needed):

```bash
cd services/render
go mod tidy
go run .
```

## Notes

- Renders are **approximations**: Chromium ≠ every real mobile mail client; use Lithmuth for speed, then Litmus or devices for final QA.
- Very large HTML payloads may hit `data:` URL limits in Chrome; switch to a temp-file navigation in `render.go` if you need enterprise-sized messages.
