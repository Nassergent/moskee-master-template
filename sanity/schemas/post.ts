import { defineType, defineField } from 'sanity';

export const post = defineType({
  name: 'post',
  title: 'Artikelen & Updates',
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
      description: 'De kop van het artikel zoals getoond op de website.',
      validation: (rule) => rule.required(),
      group: 'inhoud',
    }),
    defineField({
      name: 'postType',
      title: 'Type',
      type: 'string',
      description: 'Bepaalt het type badge op de website.',
      options: {
        list: [
          { title: 'Nieuws', value: 'nieuws' },
          { title: 'Mededeling', value: 'mededeling' },
          { title: 'Artikel', value: 'artikel' },
        ],
        layout: 'radio',
      },
      initialValue: 'nieuws',
      group: 'inhoud',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'URL-pad van het artikel. Klik op "Generate" om te genereren vanuit de titel.',
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
      name: 'datum',
      title: 'Publicatiedatum',
      type: 'datetime',
      description: 'Wordt getoond bij het artikel. Nieuwste artikelen verschijnen bovenaan.',
      initialValue: () => new Date().toISOString(),
      group: 'inhoud',
    }),
    defineField({
      name: 'samenvatting',
      title: 'Samenvatting',
      type: 'text',
      rows: 3,
      description: 'Korte samenvatting voor de overzichtspagina en Google-zoekresultaten.',
      group: 'inhoud',
    }),
    defineField({
      name: 'afbeelding',
      title: 'Afbeelding',
      type: 'image',
      description: 'Hoofdafbeelding van het artikel. Aanbevolen: liggend formaat, min. 600px breed.',
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
      type: 'array',
      description: 'De volledige tekst van het artikel. U kunt hier ook afbeeldingen toevoegen.',
      of: [
        { type: 'block' },
        { type: 'image', options: { hotspot: true } },
      ],
      group: 'inhoud',
    }),
    defineField({
      name: 'onderwerpHub',
      title: 'Hoofdartikel (Topic Hub)',
      type: 'reference',
      to: [{ type: 'post' }],
      description: 'Optioneel: koppel dit artikel aan een hoofdartikel. Het hoofdartikel toont dan automatisch alle gekoppelde berichten en agenda-items.',
      group: 'publicatie',
    }),
    defineField({
      name: 'gepubliceerd',
      title: 'Gepubliceerd',
      type: 'boolean',
      initialValue: false,
      description: 'AAN = zichtbaar op de website. UIT = verborgen (concept).',
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
    { title: 'Datum (nieuwste)', name: 'datumDesc', by: [{ field: 'datum', direction: 'desc' }] },
  ],
  preview: {
    select: { title: 'titel', subtitle: 'datum', media: 'afbeelding', postType: 'postType' },
    prepare({ title, subtitle, media, postType }) {
      const typeLabel = postType === 'mededeling' ? '📢' : postType === 'artikel' ? '📄' : '📰';
      return { title: `${typeLabel} ${title || 'Zonder titel'}`, subtitle, media };
    },
  },
});
