package main

import (
	"strings"

	"github.com/microcosm-cc/bluemonday"
)

func sanitizeEmailHTML(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	p := bluemonday.UGCPolicy()
	p.AllowStandardURLs()
	return p.Sanitize(raw)
}

func wrapEmailDocument(fragment string) string {
	frag := sanitizeEmailHTML(fragment)
	return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  html, body { margin: 0; padding: 0; background: #fff; }
  body { -webkit-text-size-adjust: 100%; }
  img { max-width: 100% !important; height: auto !important; }
  table { border-collapse: collapse; }
</style>
</head>
<body>` + frag + `</body></html>`
}
