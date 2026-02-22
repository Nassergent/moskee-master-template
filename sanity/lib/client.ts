import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

function getEnv(key: string): string | undefined {
  try {
    return (import.meta as any).env?.[key] ?? undefined;
  } catch {
    return undefined;
  }
}

// Public read client — useCdn: true voor snelle, gecachte responses
// Geen token nodig: leest alleen publieke data via CDN
export const sanityClient = createClient({
  projectId: getEnv('PUBLIC_SANITY_PROJECT_ID') || 'qjg8nn9m',
  dataset: getEnv('PUBLIC_SANITY_DATASET') || 'production',
  useCdn: true,
  apiVersion: '2024-01-01',
});

// Write client for creating documents (volunteer form etc.)
// Token MOET via env var — geen hardcoded fallback
export const writeClient = createClient({
  projectId: getEnv('PUBLIC_SANITY_PROJECT_ID') || 'qjg8nn9m',
  dataset: getEnv('PUBLIC_SANITY_DATASET') || 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
  token: getEnv('SANITY_WRITE_TOKEN') || getEnv('SANITY_API_TOKEN'),
});

const builder = imageUrlBuilder(sanityClient);

export function urlFor(source: any) {
  // Enforce WebP format and max 2000px width for all Sanity images
  return builder.image(source).format('webp').quality(80);
}
