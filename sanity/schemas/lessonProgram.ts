import { defineType, defineField } from 'sanity';

// Tijdslots: elk half uur van 06:00 tot 23:00
const timeSlots = Array.from({ length: 35 }, (_, i) => {
  const h = Math.floor(i / 2) + 6;
  const m = i % 2 === 0 ? '00' : '30';
  const val = `${String(h).padStart(2, '0')}:${m}`;
  return { title: val, value: val };
});

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
  fields: [
    defineField({
      name: 'titel',
      title: 'Titel',
      type: 'string',
      description: 'Naam van het lesprogramma, bijv. "Koranles" of "Arabisch voor beginners".',
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      hidden: true,
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
      name: 'categorie',
      title: 'Categorie',
      type: 'string',
      description: 'Doelgroep van dit lesprogramma. Bepaalt de groepering op de website.',
      options: { list: categorieOptions, layout: 'dropdown' },
      initialValue: 'algemeen',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'beschrijving',
      title: 'Beschrijving',
      type: 'text',
      rows: 4,
      description: 'Korte beschrijving van het lesprogramma (plain text).',
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
    }),
    defineField({
      name: 'afbeelding',
      title: 'Afbeelding',
      type: 'image',
      options: { hotspot: true },
      description: 'Optionele afbeelding bij het lesprogramma.',
    }),
    defineField({
      name: 'maxCapaciteit',
      title: 'Maximale Capaciteit',
      type: 'number',
      description: 'Maximaal aantal deelnemers. Laat leeg voor onbeperkt.',
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: 'inschrijvingOpen',
      title: 'Inschrijving Open',
      type: 'boolean',
      description: 'AAN = bezoekers kunnen zich inschrijven.',
      initialValue: true,
    }),
    defineField({
      name: 'vrijwilligersLink',
      title: 'Vrijwilligerslink',
      type: 'url',
      description: 'Optionele link naar vrijwilligers- of inschrijfformulier (bijv. Google Forms). Als leeg → /contact.',
    }),
    defineField({
      name: 'rooster',
      title: 'Lesrooster',
      type: 'array',
      description: 'Wekelijks terugkerend rooster voor dit programma.',
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
    }),
    defineField({
      name: 'actief',
      title: 'Actief',
      type: 'boolean',
      description: 'AAN = zichtbaar op de website.',
      initialValue: true,
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
