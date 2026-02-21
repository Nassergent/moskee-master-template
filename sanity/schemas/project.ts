import { defineType, defineField } from 'sanity';

export const project = defineType({
  name: 'project',
  title: 'Projecten',
  type: 'document',
  fields: [
    defineField({
      name: 'titel',
      title: 'Titel',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'beschrijving',
      title: 'Beschrijving',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'afbeelding',
      title: 'Afbeelding',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'doelbedrag',
      title: 'Doelbedrag (€)',
      type: 'number',
    }),
    defineField({
      name: 'huidigBedrag',
      title: 'Huidig Bedrag (€)',
      type: 'number',
    }),
    defineField({
      name: 'citaat',
      title: 'Gekoppeld Citaat',
      type: 'reference',
      to: [{ type: 'quote' }],
      description: 'Optioneel: koppel een islamitisch citaat aan dit project',
    }),
    defineField({
      name: 'actief',
      title: 'Actief',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  preview: {
    select: { title: 'titel', subtitle: 'doelbedrag', media: 'afbeelding' },
    prepare({ title, subtitle }) {
      return { title, subtitle: subtitle ? `Doel: €${subtitle}` : '' };
    },
  },
});
