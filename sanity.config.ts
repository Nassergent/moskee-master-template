import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schema } from './sanity/schema';
import { structure, newDocumentOptions } from './sanity/structure';

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = import.meta.env.PUBLIC_SANITY_DATASET || 'production';

if (!projectId) {
  throw new Error('Missing PUBLIC_SANITY_PROJECT_ID — set it in .env');
}

export default defineConfig({
  name: 'moskee-in-a-box',
  title: 'Moskee CMS',
  projectId,
  dataset,
  plugins: [structureTool({ structure }), visionTool()],
  schema,
  document: {
    newDocumentOptions,
  },
});
