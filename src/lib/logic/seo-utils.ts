export function sanitizeAlt(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/[^\w\sÀ-ÿ\u0600-\u06FF.,!?'-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
