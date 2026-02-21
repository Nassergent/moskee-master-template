// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sanity from '@sanity/astro';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://moskee-template.vercel.app',
  output: 'server',
  adapter: vercel(),
  integrations: [
    react(),
    sanity({
      projectId: 'qjg8nn9m',
      dataset: 'production',
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
