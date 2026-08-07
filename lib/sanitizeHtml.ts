const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function sanitizeHtml(value: string): string {
  if (!value) return '';

  let sanitized = value;
  sanitized = sanitized.replace(
    /<\s*(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi,
    '',
  );
  sanitized = sanitized.replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/?>/gi, '');

  sanitized = sanitized.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag) => {
    const normalizedTag = tag.toLowerCase();
    const allowedTags = [
      'b',
      'strong',
      'i',
      'em',
      'u',
      'br',
      'p',
      'div',
      'img',
      'ul',
      'ol',
      'li',
      'blockquote',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
    ];
    if (!allowedTags.includes(normalizedTag)) {
      return escapeHtml(match);
    }

    if (normalizedTag === 'img') {
      const srcMatch = match.match(/src=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
      const altMatch = match.match(/alt=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
      const src = srcMatch ? srcMatch[1] || srcMatch[2] || srcMatch[3] || '' : '';
      const alt = altMatch ? altMatch[1] || altMatch[2] || altMatch[3] || '' : '';
      const cleanSrc = escapeHtml(src);
      const cleanAlt = escapeHtml(alt);
      return `<img src="${cleanSrc}" alt="${cleanAlt}" loading="lazy" style="max-width:100%;height:auto;border-radius:12px;margin:1rem 0;display:block;" />`;
    }

    if (normalizedTag === 'br') {
      return '<br />';
    }

    return match.startsWith('</') ? `</${normalizedTag}>` : `<${normalizedTag}>`;
  });

  sanitized = sanitized.replace(/\r\n?|\n/g, '<br />');
  return sanitized;
}
