export function extractImageIdsFromHtml(html: string): string[] {
  if (!html) return [];
  const ids: string[] = [];
  const re = /\/api\/uploads\/([a-zA-Z0-9_-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[1]) ids.push(m[1]);
  }
  return Array.from(new Set(ids));
}
