import { defineType, defineField } from 'sanity';
import { timeSlots } from '../lib/timeSlots';

const weekDays = [
  { title: 'Maandag', value: 'maandag' },
  { title: 'Dinsdag', value: 'dinsdag' },
  { title: 'Woensdag', value: 'woensdag' },
  { title: 'Donderdag', value: 'donderdag' },
  { title: 'Vrijdag', value: 'vrijdag' },
  { title: 'Zaterdag', value: 'zaterdag' },
  { title: 'Zondag', value: 'zondag' },
];

const categorieOptions = [
  { title: 'Kinderen', value: 'kinderen' },
  { title: 'Jongeren', value: 'jongeren' },
  { title: 'Vrouwen', value: 'vrouwen' },
  { title: 'Mannen', value: 'mannen' },
  { title: 'Algemeen', value: 'algemeen' },
];

export const lessonProgram = defineType({
  name: 'lessonProgram',
  title: 'Lesprogramma',
  type: 'document',
  groups: [
    { name: 'inhoud', title: 'Inhoud', default: true },
    { name: 'rooster', title: 'Rooster' },
    { name: 'publicatie', title: 'Publicatie' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'titel',
      title: 'Titel',
      type: 'string',
      description: 'Naam van het lesprogramma, bijv. "Koranles" of "Arabisch voor beginners".',
      validation: (Rule) => Rule.required().max(120),
      group: 'inhoud',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'URL-pad van het lesprogramma. Klik op "Generate" om te genereren vanuit de titel.',
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
      name: 'categorie',
      title: 'Categorie',
      type: 'string',
      description: 'Doelgroep van dit lesprogramma. Bepaalt de groepering op de website.',
      options: { list: categorieOptions, layout: 'dropdown' },
      initialValue: 'algemeen',
      validation: (Rule) => Rule.required(),
      group: 'inhoud',
    }),
    defineField({
      name: 'beschrijving',
      title: 'Beschrijving',
      type: 'text',
      rows: 4,
      description: 'Korte beschrijving van het lesprogramma (plain text).',
      group: 'inhoud',
    }),
    defineField({
      name: 'inhoud',
      title: 'Inhoud',
      description: 'Uitgebreide tekst voor het lesprogramma. Gebruik koppen, lijsten en afbeeldingen.',
      type: 'array',
      of: [
        { type: 'block' },
        { type: 'image', options: { hotspot: true } },
      ],
      group: 'inhoud',
    }),
    defineField({
      name: 'afbeelding',
      title: 'Afbeelding',
      type: 'image',
      options: { hotspot: true },
      description: 'Optionele afbeelding bij het lesprogramma.',
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
      name: 'maxCapaciteit',
      title: 'Maximale Capaciteit',
      type: 'number',
      description: 'Maximaal aantal deelnemers. Laat leeg voor onbeperkt.',
      validation: (Rule) => Rule.min(1),
      group: 'inhoud',
    }),
    defineField({
      name: 'inschrijvingOpen',
      title: 'Inschrijving Open',
      type: 'boolean',
      description: 'AAN = bezoekers kunnen zich inschrijven.',
      initialValue: true,
      group: 'inhoud',
    }),
    defineField({
      name: 'vrijwilligersLink',
      title: 'Vrijwilligerslink',
      type: 'url',
      description: 'Optionele link naar vrijwilligers- of inschrijfformulier (bijv. Google Forms). Als leeg → /contact.',
      group: 'inhoud',
    }),
    defineField({
      name: 'rooster',
      title: 'Lesrooster',
      type: 'array',
      description: 'Wekelijks terugkerend rooster voor dit programma.',
      group: 'rooster',
      of: [
        {
          type: 'object',
          name: 'roosterItem',
          title: 'Lesmoment',
          fields: [
            defineField({
              name: 'dag',
              title: 'Dag',
              type: 'string',
              options: { list: weekDays, layout: 'dropdown' },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'startTijd',
              title: 'Starttijd',
              type: 'string',
              options: { list: timeSlots, layout: 'dropdown' },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'eindTijd',
              title: 'Eindtijd',
              type: 'string',
              options: { list: timeSlots, layout: 'dropdown' },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'actief',
              title: 'Actief',
              type: 'boolean',
              initialValue: true,
              description: 'UIT = dit lesmoment wordt niet getoond.',
            }),
          ],
          preview: {
            select: { dag: 'dag', start: 'startTijd', eind: 'eindTijd', actief: 'actief' },
            prepare({ dag, start, eind, actief }) {
              const prefix = actief === false ? '[UIT] ' : '';
              return {
                title: `${prefix}${dag || '?'}`,
                subtitle: `${start || '?'} – ${eind || '?'}`,
              };
            },
          },
        },
      ],
    }),
    defineField({
      name: 'volgorde',
      title: 'Volgorde',
      type: 'number',
      description: 'Lagere waarde = eerder getoond op de pagina.',
      initialValue: 10,
      group: 'publicatie',
    }),
    defineField({
      name: 'actief',
      title: 'Actief',
      type: 'boolean',
      description: 'Zet AAN als dit lesprogramma klaar is om te tonen op de website.',
      initialValue: false,
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
    {
      title: 'Volgorde (oplopend)',
      name: 'volgordeAsc',
      by: [{ field: 'volgorde', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'titel',
      categorie: 'categorie',
      actief: 'actief',
      media: 'afbeelding',
    },
    prepare({ title, categorie, actief, media }) {
      const prefix = actief === false ? '[UIT] ' : '';
      const cat = categorie ? categorie.charAt(0).toUpperCase() + categorie.slice(1) : '';
      return {
        title: `${prefix}${title || 'Zonder titel'}`,
        subtitle: cat,
        media,
      };
    },
  },
});
