import { defineType, defineField } from 'sanity';

export const etiquette = defineType({
  name: 'etiquette',
  title: 'Moskee-etiketten / Huisregels',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Titel',
      type: 'string',
      validation: (rule) => rule.required(),
      description: 'Bijv. "Kom op tijd", "Telefoon op stil", "Schoenen uit"',
    }),
    defineField({
      name: 'description',
      title: 'Omschrijving',
      type: 'text',
      rows: 3,
      description: 'Korte uitleg bij de regel',
    }),
    defineField({
      name: 'icon',
      title: 'Icoon',
      type: 'string',
      description: 'Kies een geometrisch icoon voor deze huisregel.',
      options: {
        list: [
          { title: '✦ Ster (8-puntig)', value: 'ster-8' },
          { title: '✧ Ster (4-puntig)', value: 'ster-4' },
          { title: '◇ Ruit', value: 'ruit' },
          { title: '❋ Rozet', value: 'rozet' },
          { title: '⬡ Hexagon', value: 'hexagon' },
          { title: '◎ Cirkels', value: 'cirkels' },
          { title: '☪ Maan & Ster', value: 'maan' },
          { title: '⊞ Raster', value: 'raster' },
          { title: '🕌 Mihrab (boog)', value: 'mihrab' },
          { title: '📿 Tasbih (kralen)', value: 'tasbih' },
        ],
      },
    }),
    defineField({
      name: 'volgorde',
      title: 'Volgorde',
      type: 'number',
      description: 'Lagere nummers verschijnen eerst',
    }),
  ],
  orderings: [
    { title: 'Volgorde', name: 'volgordeAsc', by: [{ field: 'volgorde', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'title', subtitle: 'icon' },
    prepare({ title, subtitle }) {
      return { title: `${subtitle || ''} ${title}` };
    },
  },
});
