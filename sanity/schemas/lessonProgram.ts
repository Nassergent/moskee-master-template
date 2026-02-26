import { defineType, defineField } from 'sanity';

const weekDays = [
  { title: 'Maandag', value: 'maandag' },
  { title: 'Dinsdag', value: 'dinsdag' },
  { title: 'Woensdag', value: 'woensdag' },
  { title: 'Donderdag', value: 'donderdag' },
  { title: 'Vrijdag', value: 'vrijdag' },
  { title: 'Zaterdag', value: 'zaterdag' },
  { title: 'Zondag', value: 'zondag' },
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
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'beschrijving',
      title: 'Beschrijving',
      type: 'text',
      rows: 4,
      description: 'Korte beschrijving van het lesprogramma.',
    }),
    defineField({
      name: 'afbeelding',
      title: 'Afbeelding',
      type: 'image',
      options: { hotspot: true },
      description: 'Optionele afbeelding bij het lesprogramma.',
    }),
    defineField({
      name: 'leeftijdsgroep',
      title: 'Leeftijdsgroep',
      type: 'string',
      description: 'Bijv. "6-12 jaar", "Volwassenen", "Alle leeftijden".',
    }),
    defineField({
      name: 'niveaus',
      title: 'Niveaus',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Bijv. "Beginners", "Gevorderden". Laat leeg als niet van toepassing.',
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
      name: 'inschrijvingLink',
      title: 'Inschrijvingslink',
      type: 'url',
      description: 'Optionele externe link voor inschrijving (bijv. Google Forms). Als leeg, wordt doorverwezen naar /contact.',
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
              description: 'Formaat: HH:MM (bijv. 10:00)',
              validation: (Rule) => Rule.required().regex(/^\d{2}:\d{2}$/, { name: 'tijd', invert: false }),
            }),
            defineField({
              name: 'eindTijd',
              title: 'Eindtijd',
              type: 'string',
              description: 'Formaat: HH:MM (bijv. 12:00)',
              validation: (Rule) => Rule.required().regex(/^\d{2}:\d{2}$/, { name: 'tijd', invert: false }),
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
      leeftijd: 'leeftijdsgroep',
      actief: 'actief',
      media: 'afbeelding',
    },
    prepare({ title, leeftijd, actief, media }) {
      const prefix = actief === false ? '[UIT] ' : '';
      return {
        title: `${prefix}${title || 'Zonder titel'}`,
        subtitle: leeftijd || '',
        media,
      };
    },
  },
});
