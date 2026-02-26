import { defineType, defineField } from 'sanity';

// Tijdslots: elk half uur van 06:00 tot 23:00
const timeSlots = Array.from({ length: 35 }, (_, i) => {
  const h = Math.floor(i / 2) + 6;
  const m = i % 2 === 0 ? '00' : '30';
  const val = `${String(h).padStart(2, '0')}:${m}`;
  return { title: val, value: val };
});

export const ramadanOverride = defineType({
  name: 'ramadanOverride',
  title: 'Ramadan Lesrooster',
  type: 'document',
  fields: [
    defineField({
      name: 'ingeschakeld',
      title: 'Ramadan Rooster Inschakelen',
      type: 'boolean',
      description: 'AAN = het Ramadan-rooster vervangt het normale lesrooster op de Lessen-pagina.',
      initialValue: false,
    }),
    defineField({
      name: 'omschrijving',
      title: 'Omschrijving',
      type: 'text',
      rows: 3,
      description: 'Optionele toelichting voor bezoekers, bijv. "Tijdens de Ramadan gelden aangepaste lestijden."',
    }),
    defineField({
      name: 'rooster',
      title: 'Ramadan Rooster',
      type: 'array',
      description: 'Aangepast rooster tijdens de Ramadan.',
      of: [
        {
          type: 'object',
          name: 'ramadanItem',
          title: 'Ramadan Lesmoment',
          fields: [
            defineField({
              name: 'datum',
              title: 'Datum',
              type: 'date',
              description: 'Specifieke datum voor dit lesmoment.',
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
              name: 'notitie',
              title: 'Notitie',
              type: 'string',
              description: 'Optionele korte notitie, bijv. "Koranles" of "Vervalt".',
            }),
          ],
          preview: {
            select: { datum: 'datum', start: 'startTijd', eind: 'eindTijd', notitie: 'notitie' },
            prepare({ datum, start, eind, notitie }) {
              const datumStr = datum
                ? new Date(datum + 'T00:00:00').toLocaleDateString('nl-BE', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'long',
                  })
                : '?';
              return {
                title: datumStr,
                subtitle: `${start || '?'} – ${eind || '?'}${notitie ? ` — ${notitie}` : ''}`,
              };
            },
          },
        },
      ],
    }),
  ],
  preview: {
    select: { ingeschakeld: 'ingeschakeld' },
    prepare({ ingeschakeld }) {
      return {
        title: 'Ramadan Lesrooster',
        subtitle: ingeschakeld ? 'ACTIEF — vervangt normaal rooster' : 'Uit — normaal rooster is actief',
      };
    },
  },
});
