/** Pull fragment from a full HTML document paste. */
export function extractEmailFragment(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const body = t.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (body) return body[1].trim();
  return t;
}
