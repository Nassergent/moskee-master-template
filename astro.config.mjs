// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import sanity from '@sanity/astro';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

const env = loadEnv('', process.cwd(), 'PUBLIC_');

export default defineConfig({
  site: 'https://moskee-master-template.vercel.app',
  output: 'server',
  adapter: vercel(),
  integrations: [
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
