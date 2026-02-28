import { defineType, defineField } from 'sanity';

export const service = defineType({
  name: 'service',
  title: 'Diensten',
  type: 'document',
  groups: [
    { name: 'inhoud', title: 'Inhoud', default: true },
    { name: 'publicatie', title: 'Publicatie' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'titel',
      title: 'Titel',
      type: 'string',
      description: 'De naam van deze dienst zoals getoond op de website.',
      validation: (rule) => rule.required(),
      group: 'inhoud',
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
      group: 'inhoud',
    }),
    defineField({
      name: 'beschrijving',
      title: 'Korte Beschrijving',
      type: 'text',
      rows: 3,
      description: 'Wordt getoond op de overzichtspagina en in Google-zoekresultaten.',
      group: 'inhoud',
    }),
    defineField({
      name: 'afbeelding',
      title: 'Afbeelding',
      type: 'image',
      description: 'Optionele foto voor deze dienst. Aanbevolen: liggend formaat, min. 800px breed.',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt-tekst',
          type: 'string',
          description: 'Beschrijving voor toegankelijkheid en SEO.',
        }),
      ],
      group: 'inhoud',
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
      group: 'inhoud',
    }),
    defineField({
      name: 'tijden',
      title: 'Tijden',
      type: 'string',
      description: 'Bijv. "Elke zondag 10:00 - 12:00"',
      group: 'inhoud',
    }),
    defineField({
      name: 'volgorde',
      title: 'Volgorde',
      type: 'number',
      description: 'Lagere nummers verschijnen eerst op de overzichtspagina.',
      group: 'publicatie',
    }),
    defineField({
      name: 'actief',
      title: 'Toon op website',
      type: 'boolean',
      initialValue: false,
      description: 'Zet AAN als deze dienst klaar is om te tonen op de website.',
      group: 'publicatie',
    }),

    // ── SEO ───────────────────────────────────────────────────
    defineField({
      name: 'seoTitle',
      title: 'SEO Titel',
      type: 'string',
      group: 'seo',
      description: 'Overschrijft de standaard paginatitel in zoekmachines. Laat leeg om de titel te gebruiken.',
      validation: (rule) => rule.max(60),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO Beschrijving',
      type: 'text',
      rows: 3,
      group: 'seo',
      description: 'Korte beschrijving voor Google-zoekresultaten. Laat leeg voor automatische samenvatting.',
      validation: (rule) => rule.max(160),
    }),
    defineField({
      name: 'ogImage',
      title: 'Social Media Afbeelding',
      type: 'image',
      group: 'seo',
      description: 'Wordt getoond als preview bij delen op social media. Aanbevolen: 1200x630px.',
    }),
  ],
  orderings: [
    { title: 'Volgorde', name: 'volgordeAsc', by: [{ field: 'volgorde', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'titel', subtitle: 'tijden', media: 'afbeelding' },
  },
});
