import { defineConfig, type DocumentActionComponent } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schema } from './sanity/schema';
import { structure, newDocumentOptions } from './sanity/structure';

// Types die een automatische slug hebben (hidden veld, gegenereerd uit titel)
const SLUG_TYPES = ['post', 'agendaEvent', 'service'];

function slugify(input: string): string {
  return input.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 96);
}

/** Wrapt de standaard publish action: vult slug automatisch in als die ontbreekt */
function autoSlugPublishAction(originalAction: DocumentActionComponent): DocumentActionComponent {
  return (props) => {
    const original = originalAction(props);
    if (!original) return null;
    return {
      ...original,
      onHandle: () => {
        const { draft, published } = props;
        const doc = draft || published;
        const titel = (doc as any)?.titel;
        const slug = (doc as any)?.slug?.current;
        if (titel && !slug) {
          props.patch.execute([
            { set: { slug: { _type: 'slug', current: slugify(titel) } } },
          ]);
        }
        original.onHandle?.();
      },
    };
  };
}

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
    actions: (prev, context) => {
      if (!SLUG_TYPES.includes(context.schemaType)) return prev;
      return prev.map((action) =>
        action.action === 'publish' ? autoSlugPublishAction(action) : action
      );
    },
  },
});
