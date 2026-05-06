package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

func main() {

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	secret := strings.TrimSpace(os.Getenv("WEBHOOK_SECRET"))

	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	mux.HandleFunc("/v1/inbound", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		if secret != "" && r.Header.Get("X-Webhook-Secret") != secret {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		if err := r.ParseMultipartForm(32 << 20); err != nil {
			http.Error(w, "bad form", http.StatusBadRequest)
			return
		}
		sender := firstNonEmpty(
			r.FormValue("sender"),
			r.FormValue("from"),
			r.FormValue("Reply-To"),
		)
		subject := r.FormValue("subject")
		htmlBody := firstNonEmpty(
			r.FormValue("body-html"),
			r.FormValue("stripped-html"),
			r.FormValue("html"),
		)
		textBody := firstNonEmpty(
			r.FormValue("body-plain"),
			r.FormValue("stripped-text"),
		)
		if sender == "" {
			http.Error(w, "missing sender", http.StatusBadRequest)
			return
		}
		if htmlBody == "" && textBody != "" {
			htmlBody = plainToHTML(textBody)
		}
		if htmlBody == "" {
			http.Error(w, "missing html or text body", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Minute)
		defer cancel()

		png, err := renderEmailPNG(ctx, htmlBody)
		if err != nil {
			log.Printf("render: %v", err)
			http.Error(w, "render failed", http.StatusInternalServerError)
			return
		}

		if err := sendPNGReply(sender, subject, png); err != nil {
			log.Printf("mail: %v", err)
			http.Error(w, "send mail failed", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "bytes": len(png)})
	})

	// Dev / integration test: JSON body with html, optional to — sends reply if SMTP configured.
	mux.HandleFunc("/v1/render-test", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		if secret != "" && r.Header.Get("X-Webhook-Secret") != secret {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		var req struct {
			HTML string `json:"html"`
			To   string `json:"to"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.HTML) == "" {
			http.Error(w, "invalid json: need { \"html\": \"...\" }", http.StatusBadRequest)
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Minute)
		defer cancel()
		png, err := renderEmailPNG(ctx, req.HTML)
		if err != nil {
			log.Printf("render: %v", err)
			http.Error(w, "render failed", http.StatusInternalServerError)
			return
		}
		to := strings.TrimSpace(req.To)
		if to != "" && smtpConfigured() {
			if err := sendPNGReply(to, "inbokslabs render test", png); err != nil {
				log.Printf("mail: %v", err)
				http.Error(w, "send mail failed", http.StatusInternalServerError)
				return
			}
		}
		w.Header().Set("Content-Type", "image/png")
		_, _ = w.Write(png)
	})

	addr := ":" + port
	log.Printf("render listening on %s", addr)
	if err := http.ListenAndServe(addr, loggingMiddleware(mux)); err != nil {
		log.Fatal(err)
	}
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start).Round(time.Millisecond))
	})
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}

func plainToHTML(text string) string {
	escaped := strings.ReplaceAll(text, "&", "&amp;")
	escaped = strings.ReplaceAll(escaped, "<", "&lt;")
	escaped = strings.ReplaceAll(escaped, ">", "&gt;")
	escaped = strings.ReplaceAll(escaped, "\n", "<br>")
	return fmt.Sprintf(
		`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;line-height:1.5;color:#111">%s</body></html>`,
		escaped,
	)
}
