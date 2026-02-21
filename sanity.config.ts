import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schema } from './sanity/schema';
import { structure, newDocumentOptions } from './sanity/structure';

export default defineConfig({
  name: 'moskee-in-a-box',
  title: 'Moskee CMS',
  projectId: 'qjg8nn9m',
  dataset: 'production',
  plugins: [structureTool({ structure }), visionTool()],
  schema,
  document: {
    newDocumentOptions,
  },
});
