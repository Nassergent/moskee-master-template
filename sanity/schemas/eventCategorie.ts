import { defineType, defineField } from 'sanity';

export const eventCategorie = defineType({
  name: 'eventCategorie',
  title: 'Activiteiten Categorieën',
  type: 'document',
  fields: [
    defineField({
      name: 'titel',
      title: 'Titel',
      type: 'string',
      description: 'Naam van de categorie (bijv. Gebed, Les, Iftar).',
      validation: (Rule) => Rule.required().max(60),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'titel',
        maxLength: 60,
        slugify: (input: string) =>
          input.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .slice(0, 60),
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'kleur',
      title: 'Badge Kleur',
      type: 'string',
      description: 'Hex kleurcode voor de badge (bijv. #1D5C6B).',
      validation: (Rule) =>
        Rule.regex(/^#[0-9A-Fa-f]{6}$/, { name: 'hex kleur' })
          .error('Gebruik een geldige hex kleur (bijv. #1D5C6B).'),
    }),
    defineField({
      name: 'icoon',
      title: 'Icoon',
      type: 'string',
      description: 'Emoji voor de filterbar (bijv. 🕌, 📚).',
    }),
    defineField({
      name: 'volgorde',
      title: 'Volgorde',
      type: 'number',
      description: 'Sortering in de filterbar (laagste eerst).',
      initialValue: 10,
    }),
  ],
  orderings: [
    {
      title: 'Volgorde',
      name: 'volgordeAsc',
      by: [{ field: 'volgorde', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'titel',
      kleur: 'kleur',
    },
    prepare({ title, kleur }) {
      return {
        title: title || 'Zonder titel',
        subtitle: kleur || 'Geen kleur',
      };
    },
  },
});
