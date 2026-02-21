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
      description: 'De naam van dit project zoals getoond op de website en donatiepagina.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'beschrijving',
      title: 'Beschrijving',
      type: 'text',
      rows: 4,
      description: 'Korte uitleg over het project. Wordt getoond op de projectenkaart.',
    }),
    defineField({
      name: 'afbeelding',
      title: 'Afbeelding',
      type: 'image',
      description: 'Optionele foto voor de projectkaart. Aanbevolen: liggend formaat, min. 600px breed.',
      options: { hotspot: true },
    }),
    defineField({
      name: 'doelbedrag',
      title: 'Doelbedrag (€)',
      type: 'number',
      description: 'Het totaalbedrag dat u wilt inzamelen voor dit project.',
    }),
    defineField({
      name: 'huidigBedrag',
      title: 'Huidig Bedrag (€)',
      type: 'number',
      description: 'Het bedrag dat al is ingezameld. Wordt automatisch bijgewerkt na een online donatie.',
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
      description: 'Alleen actieve projecten zijn zichtbaar op de website en donatiepagina.',
    }),
  ],
  preview: {
    select: { title: 'titel', subtitle: 'doelbedrag', media: 'afbeelding' },
    prepare({ title, subtitle }) {
      return { title, subtitle: subtitle ? `Doel: €${subtitle}` : '' };
    },
  },
});
