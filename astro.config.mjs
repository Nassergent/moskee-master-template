// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sanity from '@sanity/astro';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [
    react(),
    sanity({
      projectId: 'qjg8nn9m',
      dataset: 'production',
      useCdn: false,
      studioBasePath: '/admin',
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
