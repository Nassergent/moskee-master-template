import { defineType, defineField } from 'sanity';

const icoonOptions = [
  { title: 'Water (Wassing)', value: 'water' },
  { title: 'Gebed', value: 'gebed' },
  { title: 'Begrafenis', value: 'begrafenis' },
  { title: 'Hart', value: 'hart' },
  { title: 'Boek', value: 'boek' },
];

export const janazahProcedure = defineType({
  name: 'janazahProcedure',
  title: 'Janazah Gids',
  type: 'document',
  fields: [
    defineField({
      name: 'titel',
      title: 'Titel',
      type: 'string',
      description: 'Paginatitel, bijv. "Hulp bij Overlijden".',
      initialValue: 'Hulp bij Overlijden',
    }),
    defineField({
      name: 'noodnummer',
      title: 'Noodnummer',
      type: 'string',
      description: 'Telefoonnummer voor directe hulp (internationaal formaat, bijv. +32470123456).',
    }),
    defineField({
      name: 'introductie',
      title: 'Introductie',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'Inleidende tekst boven de stappen (rich text).',
    }),
    defineField({
      name: 'stappen',
      title: 'Procedure Stappen',
      type: 'array',
      description: 'De stappen van het Janazah-proces.',
      of: [
        {
          type: 'object',
          name: 'stapItem',
          title: 'Stap',
          fields: [
            defineField({
              name: 'icoon',
              title: 'Icoon',
              type: 'string',
              options: { list: icoonOptions, layout: 'dropdown' },
            }),
            defineField({
              name: 'titelNL',
              title: 'Titel (Nederlands)',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'titelAR',
              title: 'Titel (Arabisch)',
              type: 'string',
              description: 'Arabische vertaling van de stap-titel.',
            }),
            defineField({
              name: 'tekst',
              title: 'Uitleg',
              type: 'array',
              of: [{ type: 'block' }],
              description: 'Rich text uitleg van deze stap.',
            }),
          ],
          preview: {
            select: { nl: 'titelNL', ar: 'titelAR' },
            prepare({ nl, ar }) {
              return {
                title: nl || 'Zonder titel',
                subtitle: ar || '',
              };
            },
          },
        },
      ],
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO Beschrijving',
      type: 'text',
      rows: 2,
      description: 'Meta-description voor zoekmachines (max 160 tekens).',
      validation: (Rule) => Rule.max(160),
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Janazah Gids', subtitle: 'Hulp bij Overlijden' };
    },
  },
});
