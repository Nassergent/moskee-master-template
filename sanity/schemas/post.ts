import { defineType, defineField } from 'sanity';

export const post = defineType({
  name: 'post',
  title: 'Nieuws & Blog',
  type: 'document',
  fields: [
    defineField({
      name: 'titel',
      title: 'Titel',
      type: 'string',
      description: 'De kop van het artikel zoals getoond op de website.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'URL-pad voor het artikel. Klik op "Generate" om automatisch aan te maken.',
      options: { source: 'titel', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'datum',
      title: 'Publicatiedatum',
      type: 'datetime',
      description: 'Wordt getoond bij het artikel. Nieuwste artikelen verschijnen bovenaan.',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'samenvatting',
      title: 'Samenvatting',
      type: 'text',
      rows: 3,
      description: 'Korte samenvatting voor de overzichtspagina en Google-zoekresultaten.',
    }),
    defineField({
      name: 'afbeelding',
      title: 'Afbeelding',
      type: 'image',
      description: 'Hoofdafbeelding van het artikel. Aanbevolen: liggend formaat, min. 600px breed.',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', title: 'Alt-tekst (SEO)', type: 'string', description: 'Beschrijf de afbeelding voor zoekmachines en slechtzienden.' }),
      ],
    }),
    defineField({
      name: 'inhoud',
      title: 'Inhoud',
      type: 'array',
      description: 'De volledige tekst van het artikel. U kunt hier ook afbeeldingen toevoegen.',
      of: [
        { type: 'block' },
        { type: 'image', options: { hotspot: true } },
      ],
    }),
    defineField({
      name: 'gepubliceerd',
      title: 'Gepubliceerd',
      type: 'boolean',
      initialValue: true,
      description: 'AAN = zichtbaar op de website. UIT = verborgen (concept).',
    }),
  ],
  orderings: [
    { title: 'Datum (nieuwste)', name: 'datumDesc', by: [{ field: 'datum', direction: 'desc' }] },
  ],
  preview: {
    select: { title: 'titel', subtitle: 'datum', media: 'afbeelding' },
  },
});
