# Build static binary
FROM golang:1.22-bookworm AS build
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN go mod tidy && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/render .

# Chromium for headless capture (chromedp)
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    fonts-liberation \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_BIN=/usr/bin/chromium \
    CHROME_NO_SANDBOX=1

WORKDIR /app
COPY --from=build /out/render /app/render
EXPOSE 8080
CMD ["/app/render"]
