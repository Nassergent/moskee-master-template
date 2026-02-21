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
export const sanityClient = createClient({
  projectId: getEnv('PUBLIC_SANITY_PROJECT_ID') || 'qjg8nn9m',
  dataset: getEnv('PUBLIC_SANITY_DATASET') || 'production',
  useCdn: true,
  apiVersion: '2024-01-01',
  token: getEnv('SANITY_API_TOKEN') || '',
});

// Write client for creating documents (volunteer form etc.)
export const writeClient = createClient({
  projectId: getEnv('PUBLIC_SANITY_PROJECT_ID') || 'qjg8nn9m',
  dataset: getEnv('PUBLIC_SANITY_DATASET') || 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
  token: getEnv('SANITY_WRITE_TOKEN') || getEnv('SANITY_API_TOKEN') || '',
});

const builder = imageUrlBuilder(sanityClient);

export function urlFor(source: any) {
  return builder.image(source);
}
