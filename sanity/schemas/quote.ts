import { defineType, defineField } from 'sanity';

export const quote = defineType({
  name: 'quote',
  title: 'Islamitische Citaten',
  type: 'document',
  fields: [
    defineField({
      name: 'tekst',
      title: 'Citaat (Nederlands)',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required(),
      description: 'De Nederlandse vertaling van het citaat.',
    }),
    defineField({
      name: 'tekstArabisch',
      title: 'Citaat (Arabisch) — Optioneel',
      type: 'text',
      rows: 2,
      description: 'Originele Arabische tekst (optioneel).',
    }),
    defineField({
      name: 'bron',
      title: 'Bron',
      type: 'string',
      validation: (rule) => rule.required(),
      description: 'Bijv. "Sahih al-Bukhari 1423", "Quran 2:261", "Sunan at-Tirmidhi 2616"',
    }),
    defineField({
      name: 'categorie',
      title: 'Categorie',
      type: 'string',
      options: {
        list: [
          { title: 'Donaties & Sadaqah', value: 'donaties' },
          { title: 'Gemeenschap', value: 'gemeenschap' },
          { title: 'Gebed', value: 'gebed' },
          { title: 'Kennis', value: 'kennis' },
          { title: 'Algemeen', value: 'algemeen' },
        ],
      },
      initialValue: 'donaties',
      description: 'Wordt gebruikt om het juiste citaat op de juiste pagina te tonen.',
    }),
    defineField({
      name: 'actief',
      title: 'Actief',
      type: 'boolean',
      initialValue: true,
      description: 'Alleen actieve citaten worden getoond op de website.',
    }),
  ],
  preview: {
    select: { title: 'tekst', subtitle: 'bron' },
    prepare({ title, subtitle }) {
      return {
        title: title?.length > 60 ? title.substring(0, 60) + '…' : title,
        subtitle: subtitle,
      };
    },
  },
});
