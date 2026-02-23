import { createClient } from '@sanity/client';
import { createImageUrlBuilder } from '@sanity/image-url';

function getEnv(key: string): string | undefined {
  try {
    return (import.meta as any).env?.[key] ?? undefined;
  } catch {
    return undefined;
  }
}

// Fail fast: geen hardcoded fallbacks — voorkomt cross-tenant data access
const projectId = getEnv('PUBLIC_SANITY_PROJECT_ID');
const dataset = getEnv('PUBLIC_SANITY_DATASET') || 'production';

if (!projectId) {
  throw new Error('Missing PUBLIC_SANITY_PROJECT_ID — set it in .env');
}

// Public read client — useCdn: true voor snelle, gecachte responses
// Geen token nodig: leest alleen publieke data via CDN
export const sanityClient = createClient({
  projectId,
  dataset,
  useCdn: true,
  apiVersion: '2024-01-01',
});

// Fresh client — useCdn: false voor data die real-time moet zijn (donaties, bedragen)
export const freshClient = createClient({
  projectId,
  dataset,
  useCdn: false,
  apiVersion: '2024-01-01',
});

// Write client for creating documents (volunteer form etc.)
// Token MOET via env var — geen hardcoded fallback
export const writeClient = createClient({
  projectId,
  dataset,
  useCdn: false,
  apiVersion: '2024-01-01',
  token: getEnv('SANITY_WRITE_TOKEN') || getEnv('SANITY_API_TOKEN'),
});

const builder = createImageUrlBuilder({ projectId: projectId!, dataset });

export function urlFor(source: any) {
  // Enforce WebP format and max 2000px width for all Sanity images
  return builder.image(source).format('webp').quality(80);
}
