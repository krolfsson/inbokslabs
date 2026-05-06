package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"
	"time"

	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/chromedp"
)

func chromeExecPath() string {
	if p := os.Getenv("CHROME_BIN"); p != "" {
		return p
	}
	candidates := []string{
		"/usr/bin/chromium",
		"/usr/bin/chromium-browser",
		"/usr/bin/google-chrome",
		"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
	}
	for _, c := range candidates {
		if st, err := os.Stat(c); err == nil && !st.IsDir() {
			return c
		}
	}
	return ""
}

func renderEmailPNG(ctx context.Context, htmlFragment string) ([]byte, error) {
	doc := wrapEmailDocument(htmlFragment)
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.NoFirstRun,
		chromedp.NoDefaultBrowserCheck,
		chromedp.DisableGPU,
	)
	if p := chromeExecPath(); p != "" {
		opts = append(opts, chromedp.ExecPath(p))
	}
	if os.Getenv("CHROME_NO_SANDBOX") != "0" {
		opts = append(opts, chromedp.NoSandbox)
	}

	allocCtx, cancelAlloc := chromedp.NewExecAllocator(ctx, opts...)
	defer cancelAlloc()

	browserCtx, cancelBrowser := chromedp.NewContext(allocCtx)
	defer cancelBrowser()

	browserCtx, cancelTimeout := context.WithTimeout(browserCtx, 2*time.Minute)
	defer cancelTimeout()

	var pngShot []byte
	dataURL := "data:text/html;charset=utf-8;base64," + base64.StdEncoding.EncodeToString([]byte(doc))

	err := chromedp.Run(browserCtx,
		chromedp.EmulateViewport(390, 844, chromedp.EmulateScale(2)),
		chromedp.Navigate(dataURL),
		chromedp.Sleep(450*time.Millisecond),
		chromedp.ActionFunc(func(ctx context.Context) error {
			_ = page.StopLoading().Do(ctx)
			return nil
		}),
		chromedp.FullScreenshot(&pngShot, 90),
	)
	if err != nil {
		return nil, fmt.Errorf("chromedp: %w", err)
	}

	framed, err := composePhoneFrame(pngShot)
	if err != nil {
		return nil, err
	}
	return framed, nil
}
