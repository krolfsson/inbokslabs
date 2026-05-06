package main

import (
	"bytes"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"io"
	"mime/multipart"
	"mime/quotedprintable"
	"net"
	"net/smtp"
	"net/textproto"
	"os"
	"strconv"
	"strings"
)

func smtpConfigured() bool {
	return strings.TrimSpace(os.Getenv("SMTP_HOST")) != "" &&
		strings.TrimSpace(os.Getenv("SMTP_USER")) != "" &&
		strings.TrimSpace(os.Getenv("SMTP_FROM")) != ""
}

func sendPNGReply(toEmail, subject string, png []byte) error {
	host := strings.TrimSpace(os.Getenv("SMTP_HOST"))
	user := strings.TrimSpace(os.Getenv("SMTP_USER"))
	pass := os.Getenv("SMTP_PASSWORD")
	from := strings.TrimSpace(os.Getenv("SMTP_FROM"))
	if host == "" || user == "" || from == "" {
		return fmt.Errorf("smtp not configured: need SMTP_HOST, SMTP_USER, SMTP_FROM")
	}

	port := 587
	if p := os.Getenv("SMTP_PORT"); p != "" {
		if n, err := strconv.Atoi(p); err == nil {
			port = n
		}
	}

	subj := subject
	if subj == "" {
		subj = "Your Lithmuth mockup"
	}
	if !strings.HasPrefix(strings.ToLower(subj), "re:") {
		subj = "Re: " + subj
	}

	body := "Here is your Lithmuth iPhone mockup PNG (see attachment)."

	var parts bytes.Buffer
	mw := multipart.NewWriter(&parts)
	boundary := mw.Boundary()

	th := make(textproto.MIMEHeader)
	th.Set("Content-Type", "text/plain; charset=UTF-8")
	th.Set("Content-Transfer-Encoding", "quoted-printable")
	textPart, err := mw.CreatePart(th)
	if err != nil {
		return err
	}
	qw := quotedprintable.NewWriter(textPart)
	if _, err := qw.Write([]byte(body + "\r\n")); err != nil {
		return err
	}
	_ = qw.Close()

	ah := make(textproto.MIMEHeader)
	ah.Set("Content-Type", `image/png; name="mockup.png"`)
	ah.Set("Content-Transfer-Encoding", "base64")
	ah.Set("Content-Disposition", `attachment; filename="lithmuth-mockup.png"`)
	attachPart, err := mw.CreatePart(ah)
	if err != nil {
		return err
	}
	enc := base64.NewEncoder(base64.StdEncoding, attachPart)
	if _, err := enc.Write(png); err != nil {
		return err
	}
	_ = enc.Close()

	if err := mw.Close(); err != nil {
		return err
	}

	var msg bytes.Buffer
	fmt.Fprintf(&msg, "From: %s\r\n", from)
	fmt.Fprintf(&msg, "To: %s\r\n", toEmail)
	fmt.Fprintf(&msg, "Subject: %s\r\n", encodeSubject(subj))
	fmt.Fprintf(&msg, "MIME-Version: 1.0\r\n")
	fmt.Fprintf(&msg, "Content-Type: multipart/mixed; boundary=%s\r\n\r\n", boundary)
	if _, err := io.Copy(&msg, &parts); err != nil {
		return err
	}

	addr := fmt.Sprintf("%s:%d", host, port)
	auth := smtp.PlainAuth("", user, pass, host)

	return sendSMTPTLS(addr, auth, from, []string{toEmail}, msg.Bytes())
}

func encodeSubject(s string) string {
	if s == "" {
		return ""
	}
	return fmt.Sprintf("=?UTF-8?B?%s?=", base64.StdEncoding.EncodeToString([]byte(s)))
}

func sendSMTPTLS(addr string, auth smtp.Auth, from string, to []string, msg []byte) error {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return err
	}
	conn, err := tls.Dial("tcp", addr, &tls.Config{ServerName: host})
	if err != nil {
		return err
	}
	defer conn.Close()

	c, err := smtp.NewClient(conn, host)
	if err != nil {
		return err
	}
	defer c.Close()

	if ok, _ := c.Extension("AUTH"); ok {
		if err = c.Auth(auth); err != nil {
			return err
		}
	}
	if err = c.Mail(from); err != nil {
		return err
	}
	for _, rcpt := range to {
		if err = c.Rcpt(rcpt); err != nil {
			return err
		}
	}
	wc, err := c.Data()
	if err != nil {
		return err
	}
	if _, err = wc.Write(msg); err != nil {
		return err
	}
	if err = wc.Close(); err != nil {
		return err
	}
	return c.Quit()
}
