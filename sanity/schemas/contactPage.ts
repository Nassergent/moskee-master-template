import { defineType, defineField } from 'sanity';

export const contactPage = defineType({
  name: 'contactPage',
  title: 'Contact Pagina',
  type: 'document',
  groups: [
    { name: 'inhoud', title: 'Inhoud', default: true },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'introText',
      title: 'Intro Tekst',
      type: 'text',
      rows: 2,
      description: 'Korte introductietekst onder de paginatitel',
      group: 'inhoud',
    }),
    defineField({
      name: 'openingstijden',
      title: 'Openingstijden',
      type: 'array',
      group: 'inhoud',
      of: [
        {
          type: 'object',
          name: 'openingstijd',
          fields: [
            defineField({ name: 'dagen', title: 'Dagen', type: 'string', validation: (rule) => rule.required() }),
            defineField({ name: 'tijden', title: 'Tijden', type: 'string', validation: (rule) => rule.required() }),
            defineField({ name: 'opmerking', title: 'Opmerking', type: 'string' }),
          ],
          preview: {
            select: { title: 'dagen', subtitle: 'tijden' },
          },
        },
      ],
    }),
    defineField({
      name: 'onderwerpen',
      title: 'Onderwerpen (dropdown)',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Keuzes voor het onderwerp-dropdown in het contactformulier',
      group: 'inhoud',
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
  preview: {
    prepare() {
      return { title: 'Contact Pagina' };
    },
  },
});
