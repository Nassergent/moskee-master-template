import { defineType, defineField } from 'sanity';

export const quote = defineType({
  name: 'quote',
  title: 'Islamitische Citaten',
  type: 'document',
  groups: [
    { name: 'inhoud', title: 'Inhoud', default: true },
    { name: 'publicatie', title: 'Publicatie' },
  ],
  fields: [
    defineField({
      name: 'tekst',
      title: 'Citaat (Nederlands)',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required(),
      description: 'De Nederlandse vertaling van het citaat.',
      group: 'inhoud',
    }),
    defineField({
      name: 'tekstArabisch',
      title: 'Citaat (Arabisch) — Optioneel',
      type: 'text',
      rows: 2,
      description: 'Originele Arabische tekst (optioneel).',
      group: 'inhoud',
    }),
    defineField({
      name: 'bron',
      title: 'Bron',
      type: 'string',
      validation: (rule) => rule.required(),
      description: 'Bijv. "Sahih al-Bukhari 1423", "Quran 2:261", "Sunan at-Tirmidhi 2616"',
      group: 'inhoud',
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
      group: 'inhoud',
    }),
    defineField({
      name: 'actief',
      title: 'Actief',
      type: 'boolean',
      initialValue: false,
      description: 'Zet AAN als dit citaat klaar is om te tonen op de website.',
      group: 'publicatie',
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
