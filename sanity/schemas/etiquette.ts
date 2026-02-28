import { defineType, defineField } from 'sanity';

export const etiquette = defineType({
  name: 'etiquette',
  title: 'Moskee-etiketten / Huisregels',
  type: 'document',
  groups: [
    { name: 'inhoud', title: 'Inhoud', default: true },
    { name: 'publicatie', title: 'Publicatie' },
  ],
  fields: [
    defineField({
      name: 'titel',
      title: 'Titel',
      type: 'string',
      validation: (rule) => rule.required(),
      description: 'Bijv. "Kom op tijd", "Telefoon op stil", "Schoenen uit"',
      group: 'inhoud',
    }),
    defineField({
      name: 'beschrijving',
      title: 'Omschrijving',
      type: 'text',
      rows: 3,
      description: 'Korte uitleg bij de regel',
      group: 'inhoud',
    }),
    defineField({
      name: 'volgorde',
      title: 'Volgorde',
      type: 'number',
      description: 'Lagere nummers verschijnen eerst',
      group: 'publicatie',
    }),
    defineField({
      name: 'gepubliceerd',
      title: 'Toon op website',
      type: 'boolean',
      initialValue: false,
      description: 'Zet AAN als dit etiket klaar is om te tonen op de website.',
      group: 'publicatie',
    }),
  ],
  orderings: [
    { title: 'Volgorde', name: 'volgordeAsc', by: [{ field: 'volgorde', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'titel' },
    prepare({ title }) {
      return { title };
    },
  },
});
