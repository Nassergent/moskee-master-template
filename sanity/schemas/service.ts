import { defineType, defineField } from 'sanity';

export const service = defineType({
  name: 'service',
  title: 'Diensten',
  type: 'document',
  fields: [
    defineField({
      name: 'titel',
      title: 'Titel',
      type: 'string',
      description: 'De naam van deze dienst zoals getoond op de website.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'URL-pad voor de detailpagina. Klik op "Generate" om automatisch aan te maken.',
      options: { source: 'titel', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'beschrijving',
      title: 'Korte Beschrijving',
      type: 'text',
      rows: 3,
      description: 'Wordt getoond op de overzichtspagina en in Google-zoekresultaten.',
    }),
    defineField({
      name: 'icoon',
      title: 'Icoon',
      type: 'string',
      description: 'Kies een geometrisch icoon voor deze dienst.',
      options: {
        list: [
          { title: '✦ Ster (8-puntig)', value: 'ster-8' },
          { title: '✧ Ster (4-puntig)', value: 'ster-4' },
          { title: '◇ Ruit', value: 'ruit' },
          { title: '❋ Rozet', value: 'rozet' },
          { title: '⬡ Hexagon', value: 'hexagon' },
          { title: '◎ Cirkels', value: 'cirkels' },
          { title: '☪ Maan & Ster', value: 'maan' },
          { title: '⊞ Raster', value: 'raster' },
          { title: '🕌 Mihrab (boog)', value: 'mihrab' },
          { title: '📿 Tasbih (kralen)', value: 'tasbih' },
        ],
      },
    }),
    defineField({
      name: 'afbeelding',
      title: 'Afbeelding',
      type: 'image',
      description: 'Optionele foto voor deze dienst. Aanbevolen: liggend formaat, min. 800px breed.',
      options: { hotspot: true },
    }),
    defineField({
      name: 'inhoud',
      title: 'Inhoud',
      description: 'Uitgebreide tekst voor de detailpagina. U kunt hier ook afbeeldingen toevoegen.',
      type: 'array',
      of: [
        { type: 'block' },
        { type: 'image', options: { hotspot: true } },
      ],
    }),
    defineField({
      name: 'tijden',
      title: 'Tijden',
      type: 'string',
      description: 'Bijv. "Elke zondag 10:00 - 12:00"',
    }),
    defineField({
      name: 'volgorde',
      title: 'Volgorde',
      type: 'number',
      description: 'Lagere nummers verschijnen eerst op de overzichtspagina.',
    }),
  ],
  orderings: [
    { title: 'Volgorde', name: 'volgordeAsc', by: [{ field: 'volgorde', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'titel', subtitle: 'tijden', media: 'afbeelding' },
  },
});
