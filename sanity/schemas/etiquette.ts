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
      name: 'volgorde',
      title: 'Volgorde',
      type: 'number',
      description: 'Lagere nummers verschijnen eerst',
    }),
    defineField({
      name: 'gepubliceerd',
      title: 'Toon op website',
      type: 'boolean',
      initialValue: true,
      description: 'Zet uit om dit etiket tijdelijk te verbergen op de website',
    }),
  ],
  orderings: [
    { title: 'Volgorde', name: 'volgordeAsc', by: [{ field: 'volgorde', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'title' },
    prepare({ title }) {
      return { title };
    },
  },
});
