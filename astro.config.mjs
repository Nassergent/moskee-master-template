// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sanity from '@sanity/astro';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

const env = loadEnv('', process.cwd(), 'PUBLIC_');

export default defineConfig({
  site: env.PUBLIC_SITE_URL || 'https://moskee-master-template.vercel.app',
  output: 'server',
  adapter: vercel(),
  // Astro 5 CSRF uitgeschakeld — we doen eigen origin-check per route
  // (donate.ts: checkOrigin, webhook: HMAC verificatie, vrijwilligers: checkOrigin)
  security: { checkOrigin: false },
  integrations: [
    react(),
    sanity({
      projectId: env.PUBLIC_SANITY_PROJECT_ID,
      dataset: env.PUBLIC_SANITY_DATASET || 'production',
      useCdn: true,
      studioBasePath: '/admin',
    }),
    sitemap({
      filter: (page) =>
        !page.includes('/admin') &&
        !page.includes('/api/') &&
        !page.includes('/bedankt'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
