import { defineType, defineField } from 'sanity';

export const aboutPage = defineType({
  name: 'aboutPage',
  title: 'Over Ons Pagina',
  type: 'document',
  groups: [
    { name: 'missie', title: 'Missie', default: true },
    { name: 'waarden', title: 'Onze Waarden' },
    { name: 'team', title: 'Bestuur & Team' },
  ],
  fields: [
    defineField({
      name: 'missieTitle',
      title: 'Missie Titel',
      type: 'string',
      group: 'missie',
      description: 'Bijv. "Onze Missie", "Wie zijn wij?"',
    }),
    defineField({
      name: 'missieText',
      title: 'Missie Tekst',
      type: 'array',
      of: [{ type: 'block' }],
      group: 'missie',
      description: 'Uitgebreide missietekst (rich text)',
    }),
    defineField({
      name: 'missieImage',
      title: 'Missie Afbeelding',
      type: 'image',
      options: { hotspot: true },
      group: 'missie',
      description: 'De afbeelding naast de missietekst',
      fields: [
        defineField({ name: 'alt', title: 'Alt-tekst (SEO)', type: 'string', description: 'Beschrijf de afbeelding voor zoekmachines en slechtzienden.' }),
      ],
    }),
    defineField({
      name: 'waarden',
      title: 'Onze Waarden',
      type: 'array',
      group: 'waarden',
      of: [
        {
          type: 'object',
          name: 'waarde',
          fields: [
            defineField({ name: 'title', title: 'Titel', type: 'string', validation: (rule) => rule.required() }),
            defineField({ name: 'description', title: 'Beschrijving', type: 'text', rows: 2 }),
          ],
          preview: {
            select: { title: 'title', subtitle: 'description' },
          },
        },
      ],
    }),
    defineField({
      name: 'team',
      title: 'Bestuur & Team',
      type: 'array',
      group: 'team',
      of: [
        {
          type: 'object',
          name: 'teamlid',
          fields: [
            defineField({ name: 'naam', title: 'Naam', type: 'string', validation: (rule) => rule.required() }),
            defineField({ name: 'functie', title: 'Functie', type: 'string' }),
            defineField({ name: 'foto', title: 'Foto', type: 'image', options: { hotspot: true }, fields: [defineField({ name: 'alt', title: 'Alt-tekst', type: 'string' })] }),
          ],
          preview: {
            select: { title: 'naam', subtitle: 'functie', media: 'foto' },
          },
        },
      ],
    }),
    defineField({
      name: 'seoTitle',
      title: 'SEO Titel',
      type: 'string',
      group: 'missie',
      description: 'Optioneel: overschrijf de paginatitel voor zoekmachines (max. 70 tekens).',
      validation: (rule) => rule.max(70),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO Beschrijving',
      type: 'text',
      rows: 2,
      group: 'missie',
      description: 'Optioneel: overschrijf de meta-beschrijving voor Google (max. 160 tekens).',
      validation: (rule) => rule.max(160),
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Over Ons Pagina' };
    },
  },
});
