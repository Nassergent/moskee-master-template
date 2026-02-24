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

// Write client for creating documents (volunteer form, donations etc.)
// SANITY_WRITE_TOKEN = write-only token met minimale rechten
// Fallback op SANITY_API_TOKEN alleen in dev — in productie altijd aparte write token gebruiken
const writeToken = getEnv('SANITY_WRITE_TOKEN');
const readToken = getEnv('SANITY_API_TOKEN');

if (!writeToken && readToken) {
  console.warn('[sanity] SANITY_WRITE_TOKEN ontbreekt — fallback op SANITY_API_TOKEN. Gebruik in productie een apart write token met minimale rechten.');
}

export const writeClient = createClient({
  projectId,
  dataset,
  useCdn: false,
  apiVersion: '2024-01-01',
  token: writeToken || readToken,
});

const builder = createImageUrlBuilder({ projectId: projectId!, dataset });

export function urlFor(source: any) {
  // auto('format') → Sanity serves WebP/AVIF based on Accept header
  // Default width 1200 prevents full-resolution downloads; callers can override with .width()
  return builder.image(source).auto('format').quality(80).width(1200);
}
