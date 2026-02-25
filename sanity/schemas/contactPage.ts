import { defineType, defineField } from 'sanity';

export const contactPage = defineType({
  name: 'contactPage',
  title: 'Contact Pagina',
  type: 'document',
  fields: [
    defineField({
      name: 'introText',
      title: 'Intro Tekst',
      type: 'text',
      rows: 2,
      description: 'Korte introductietekst onder de paginatitel',
    }),
    defineField({
      name: 'openingstijden',
      title: 'Openingstijden',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'openingstijd',
          fields: [
            defineField({ name: 'dagen', title: 'Dagen', type: 'string', validation: (rule) => rule.required() }),
            defineField({ name: 'tijden', title: 'Tijden', type: 'string', validation: (rule) => rule.required() }),
            defineField({ name: 'opmerking', title: 'Opmerking', type: 'string' }),
          ],
          preview: {
            select: { title: 'dagen', subtitle: 'tijden' },
          },
        },
      ],
    }),
    defineField({
      name: 'onderwerpen',
      title: 'Onderwerpen (dropdown)',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Keuzes voor het onderwerp-dropdown in het contactformulier',
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Contact Pagina' };
    },
  },
});
