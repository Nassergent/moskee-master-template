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
      description: 'URL-pad van de dienst. Klik op "Generate" om te genereren vanuit de titel.',
      options: {
        source: 'titel',
        maxLength: 96,
        slugify: (input: string) =>
          input.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .slice(0, 96),
      },
    }),
    defineField({
      name: 'beschrijving',
      title: 'Korte Beschrijving',
      type: 'text',
      rows: 3,
      description: 'Wordt getoond op de overzichtspagina en in Google-zoekresultaten.',
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
    defineField({
      name: 'actief',
      title: 'Toon op website',
      type: 'boolean',
      initialValue: true,
      description: 'Zet uit om deze dienst tijdelijk te verbergen op de website',
    }),
  ],
  orderings: [
    { title: 'Volgorde', name: 'volgordeAsc', by: [{ field: 'volgorde', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'titel', subtitle: 'tijden', media: 'afbeelding' },
  },
});
