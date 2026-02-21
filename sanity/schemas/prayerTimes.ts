import { defineType, defineField } from 'sanity';

export const prayerTimes = defineType({
  name: 'prayerTimes',
  title: 'Gebedstijden',
  type: 'document',
  fields: [
    defineField({
      name: 'mawaqitSlug',
      title: 'Mawaqit Moskee Slug',
      type: 'string',
      description: 'De naam van uw moskee op Mawaqit, bijv. "moskeeelalbani". Te vinden in de URL: mawaqit.net/nl/[slug]',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'jumuahShifts',
      title: 'Vrijdaggebed (Jumu\'ah) Diensten',
      type: 'array',
      description: 'Voeg één of meerdere Jumu\'ah diensten toe met tijdstip en eventueel een opmerking.',
      of: [
        {
          type: 'object',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description: 'Bijv. "Eerste Khutbah", "Tweede Khutbah"',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'time',
              title: 'Tijdstip',
              type: 'string',
              description: 'Bijv. "13:00", "14:30"',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'note',
              title: 'Opmerking',
              type: 'string',
              description: 'Optioneel, bijv. "Khutbah begint stipt"',
            }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'time' },
            prepare({ title, subtitle }) {
              return { title: `${title} — ${subtitle}` };
            },
          },
        },
      ],
    }),
    defineField({
      name: 'jumuahNote',
      title: 'Vrijdaggebed — Let Op Tekst',
      type: 'text',
      rows: 3,
      description: 'Waarschuwingstekst onder de Jumu\'ah kaarten, bijv. "De iqamah-tijden kunnen variëren..."',
    }),
    defineField({
      name: 'footerNote',
      title: 'Disclaimer / Voetnoot',
      type: 'text',
      rows: 3,
      description: 'Kleine tekst onderaan de gebedstijden pagina, bijv. "Tijden kunnen afwijken tijdens Ramadan."',
    }),
  ],
  preview: {
    select: { title: 'mawaqitSlug' },
    prepare({ title }) {
      return { title: `Gebedstijden — ${title || 'Niet ingesteld'}` };
    },
  },
});
