import { urlFor } from '../../../sanity/lib/client';

interface SmartImageResult {
  src: string;
  width: number;
  height: number;
}

/** Bouwt een geoptimaliseerde Sanity afbeelding URL met expliciete dimensies */
export function smartImage(
  source: any,
  width: number,
  height: number,
  options?: { fit?: 'crop' | 'clip' | 'fill'; quality?: number }
): SmartImageResult {
  const fit = options?.fit || 'crop';
  const q = options?.quality || 80;
  const src = urlFor(source).width(width).height(height).fit(fit).quality(q).url();
  return { src, width, height };
}

/** Variant voor afbeeldingen die alleen een breedte nodig hebben (aspect-ratio uit origineel) */
export function smartImageWidth(
  source: any,
  width: number,
  options?: { quality?: number }
): { src: string; width: number } {
  const q = options?.quality || 80;
  const src = urlFor(source).width(width).quality(q).url();
  return { src, width };
}
