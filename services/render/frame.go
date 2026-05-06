package main

import (
	"bytes"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"math"

	"github.com/disintegration/imaging"
)

// composePhoneFrame places a vertical screenshot inside a simple device frame.
func composePhoneFrame(screenPNG []byte) ([]byte, error) {
	src, err := png.Decode(bytes.NewReader(screenPNG))
	if err != nil {
		return nil, err
	}

	b := src.Bounds()
	contentW := b.Dx()
	contentH := b.Dy()

	sidePad := 14
	topPad := 52
	bottomPad := 28
	innerW := contentW + sidePad*2

	scale := 1.0
	maxInner := 420
	if innerW > maxInner {
		scale = float64(maxInner) / float64(innerW)
	}

	newContentW := int(math.Round(float64(contentW) * scale))
	newContentH := int(math.Round(float64(contentH) * scale))
	scaled := imaging.Resize(src, newContentW, newContentH, imaging.Lanczos)

	sidePadS := int(math.Round(float64(sidePad) * scale))
	topPadS := int(math.Round(float64(topPad) * scale))
	bottomPadS := int(math.Round(float64(bottomPad) * scale))

	innerW = newContentW + sidePadS*2
	outerW := innerW + 38
	outerH := topPadS + newContentH + bottomPadS + 26

	img := image.NewRGBA(image.Rect(0, 0, outerW, outerH))
	bg := color.RGBA{R: 12, G: 12, B: 14, A: 255}
	draw.Draw(img, img.Bounds(), &image.Uniform{C: bg}, image.Point{}, draw.Src)

	// Outer rounded shell
	shell := color.RGBA{R: 28, G: 28, B: 32, A: 255}
	radius := 36
	fillRoundedRect(img, 10, 10, outerW-10, outerH-10, radius, shell)

	// Screen inset (black bezel)
	bezel := color.RGBA{R: 8, G: 8, B: 10, A: 255}
	x0 := (outerW - innerW) / 2
	y0 := 18
	fillRoundedRect(img, x0, y0, x0+innerW, y0+newContentH+topPadS+bottomPadS, 28, bezel)

	// Dynamic island
	islandW := int(float64(innerW) * 0.38)
	islandH := 28
	ix := outerW/2 - islandW/2
	iy := y0 + 10
	fillRoundedRect(img, ix, iy, ix+islandW, iy+islandH, islandH/2, color.RGBA{R: 0, G: 0, B: 0, A: 255})

	// Email content
	cx := x0 + sidePadS
	cy := y0 + topPadS
	draw.Draw(img, image.Rect(cx, cy, cx+newContentW, cy+newContentH), scaled, image.Point{}, draw.Over)

	// Home indicator
	indW := int(float64(innerW) * 0.22)
	indH := 4
	ix2 := outerW/2 - indW/2
	iy2 := y0 + topPadS + newContentH + bottomPadS - 12
	fillRoundedRect(img, ix2, iy2, ix2+indW, iy2+indH, 2, color.RGBA{R: 80, G: 80, B: 88, A: 255})

	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func fillRoundedRect(img *image.RGBA, x0, y0, x1, y1, r int, c color.RGBA) {
	// Simplified rounded rectangle: draw filled rect + corner circles.
	draw.Draw(img, image.Rect(x0+r, y0, x1-r, y1), &image.Uniform{C: c}, image.Point{}, draw.Src)
	draw.Draw(img, image.Rect(x0, y0+r, x1, y1-r), &image.Uniform{C: c}, image.Point{}, draw.Src)
	for _, p := range []struct {
		cx, cy int
	}{
		{x0 + r, y0 + r},
		{x1 - r, y0 + r},
		{x0 + r, y1 - r},
		{x1 - r, y1 - r},
	} {
		drawDisk(img, p.cx, p.cy, r, c)
	}
}

func drawDisk(img *image.RGBA, cx, cy, r int, c color.RGBA) {
	rf := float64(r)
	for y := -r; y <= r; y++ {
		for x := -r; x <= r; x++ {
			if float64(x*x+y*y) > rf*rf+0.5 {
				continue
			}
			px, py := cx+x, cy+y
			if image.Pt(px, py).In(img.Bounds()) {
				img.SetRGBA(px, py, c)
			}
		}
	}
}
