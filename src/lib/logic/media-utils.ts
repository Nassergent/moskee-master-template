/**
 * media-utils.ts — Media/asset type detectie
 *
 * Compartiment: LOGICA
 * Pure functies, geen side-effects.
 */

import { urlFor } from '../sanity';

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|avif|heif)$/i;

/** Check of een Sanity asset een image-type is (vs file-type) */
export function isSanityImageAsset(asset: any): boolean {
  return !!(asset?.asset?._ref?.startsWith('image-') || asset?._type === 'image');
}

/** Check of een URL een afbeeldingsextensie heeft */
export function isImageUrl(url: string | undefined | null): boolean {
  return !!(url && IMAGE_EXTENSIONS.test(url));
}

interface DownloadImageResult {
  hasImage: boolean;
  imageUrl: string | null;
  imageUrlLarge: string | null;
}

/**
 * Bepaal download image URLs voor een Sanity asset.
 * Ondersteunt zowel image-assets (via urlFor) als file-assets met image URL.
 */
export function resolveDownloadImage(
  bestand: any,
  fileUrl: string | undefined | null
): DownloadImageResult {
  const isImage = isSanityImageAsset(bestand);
  const isFileImage = isImageUrl(fileUrl);
  const hasImage = !!(bestand && (isImage || isFileImage));

  let imageUrl: string | null = null;
  let imageUrlLarge: string | null = null;

  try {
    if (isImage) {
      imageUrl = urlFor(bestand).width(600).url();
      imageUrlLarge = urlFor(bestand).width(1200).url();
    } else if (isFileImage && fileUrl) {
      imageUrl = fileUrl;
      imageUrlLarge = fileUrl;
    }
  } catch { /* fallback naar null */ }

  return { hasImage, imageUrl, imageUrlLarge };
}

/** Extract bestandsnaam uit een URL */
export function extractFileName(url: string | undefined | null): string {
  if (!url) return 'document';
  return url.split('/').pop()?.split('?')[0] || 'document';
}
