import { defineType, defineField } from 'sanity';

/**
 * prayerTimes — Singleton: Native WaqfOS Prayer Engine configuratie.
 *
 * v1.6: Mawaqit volledig verwijderd. Eigen engine is de enige bron.
 * Jumu'ah blijft CMS-managed (Nasser's Wet: dynamische content uit Sanity).
 */

const calculationMethods = [
  { title: 'Muslim World League (MWL)', value: 'MuslimWorldLeague' },
  { title: 'Islamic Society of North America (ISNA)', value: 'NorthAmerica' },
  { title: 'Egyptian General Authority', value: 'Egyptian' },
  { title: 'Umm Al-Qura (Mekka)', value: 'UmmAlQura' },
  { title: 'University of Islamic Sciences, Karachi', value: 'Karachi' },
  { title: 'Diyanet İşleri Başkanlığı (Turkije)', value: 'Turkey' },
  { title: 'Moonsighting Committee', value: 'MoonsightingCommittee' },
  { title: 'Dubai', value: 'Dubai' },
  { title: 'Kuwait', value: 'Kuwait' },
  { title: 'Qatar', value: 'Qatar' },
  { title: 'Singapore', value: 'Singapore' },
  { title: 'Tehran', value: 'Tehran' },
];

const highLatitudeRules = [
  { title: 'Midden van de Nacht (aanbevolen)', value: 'middleOfTheNight' },
  { title: 'Zevende van de Nacht', value: 'seventhOfTheNight' },
  { title: 'Schemering Hoek', value: 'twilightAngle' },
];

const prayerNames = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

function iqamaField(prayer: string, label: string) {
  return defineField({
    name: prayer,
    title: label,
    type: 'object',
    fields: [
      defineField({
        name: 'enabled',
        title: 'Iqama tonen',
        type: 'boolean',
        initialValue: true,
      }),
      defineField({
        name: 'type',
        title: 'Type',
        type: 'string',
        options: {
          list: [
            { title: 'Offset (minuten na adhan)', value: 'offset' },
            { title: 'Vast tijdstip', value: 'fixed' },
          ],
          layout: 'radio',
        },
        initialValue: 'offset',
      }),
      defineField({
        name: 'minutes',
        title: 'Minuten na adhan',
        type: 'number',
        description: 'Alleen bij type "Offset"',
        initialValue: 15,
        hidden: ({ parent }) => parent?.type !== 'offset',
      }),
      defineField({
        name: 'time',
        title: 'Vast tijdstip (HH:mm)',
        type: 'string',
        description: 'Bijv. "18:00". Alleen bij type "Vast tijdstip"',
        hidden: ({ parent }) => parent?.type !== 'fixed',
        validation: (rule) => rule.regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
          name: 'time format',
          invert: false,
        }).error('Gebruik het formaat HH:mm (bijv. 18:00)'),
      }),
      defineField({
        name: 'dayOffset',
        title: 'Volgende dag?',
        type: 'number',
        description: 'Stel in op 1 als het vaste tijdstip na middernacht valt (bijv. Isha iqama om 00:30)',
        initialValue: 0,
        options: { list: [{ title: 'Dezelfde dag', value: 0 }, { title: 'Volgende dag', value: 1 }] },
        hidden: ({ parent }) => parent?.type !== 'fixed',
      }),
    ],
  });
}

export const prayerTimes = defineType({
  name: 'prayerTimes',
  title: 'Gebedstijden',
  type: 'document',
  groups: [
    { name: 'engine', title: 'Locatie & Berekening' },
    { name: 'iqama', title: 'Iqama Instellingen' },
    { name: 'jumuah', title: 'Vrijdaggebed' },
  ],
  fields: [
    // ── Locatie & Berekening (verplicht) ──
    defineField({
      name: 'timezone',
      title: 'Tijdzone (IANA)',
      type: 'string',
      description: 'IANA tijdzone, bijv. "Europe/Brussels", "Europe/Amsterdam", "Europe/Paris"',
      initialValue: 'Europe/Brussels',
      validation: (rule) => rule.required().error('Tijdzone is verplicht voor de gebedstijden engine.'),
      group: 'engine',
    }),

    defineField({
      name: 'coordinates',
      title: 'Coördinaten',
      type: 'object',
      description: 'Latitude en longitude van de moskee. Zoek op via Google Maps.',
      validation: (rule) => rule.required().error('Coördinaten zijn verplicht voor de gebedstijden engine.'),
      group: 'engine',
      fields: [
        defineField({
          name: 'lat',
          title: 'Breedtegraad (Latitude)',
          type: 'number',
          validation: (rule) => rule.required().min(-90).max(90),
        }),
        defineField({
          name: 'lng',
          title: 'Lengtegraad (Longitude)',
          type: 'number',
          validation: (rule) => rule.required().min(-180).max(180),
        }),
      ],
    }),

    defineField({
      name: 'method',
      title: 'Berekeningsmethode',
      type: 'string',
      description: 'De wiskundige methode voor het berekenen van Fajr en Isha hoeken.',
      options: { list: calculationMethods },
      initialValue: 'MuslimWorldLeague',
      validation: (rule) => rule.required().error('Berekeningsmethode is verplicht.'),
      group: 'engine',
    }),

    defineField({
      name: 'madhab',
      title: 'Madhab (Rechtsschool)',
      type: 'string',
      description: 'Bepaalt de berekening van Asr-tijd.',
      options: {
        list: [
          { title: 'Shafi\'i / Maliki / Hanbali', value: 'shafi' },
          { title: 'Hanafi', value: 'hanafi' },
        ],
        layout: 'radio',
      },
      initialValue: 'shafi',
      validation: (rule) => rule.required().error('Madhab is verplicht.'),
      group: 'engine',
    }),

    defineField({
      name: 'highLatitudeRule',
      title: 'Hoge Breedtegraad Regel',
      type: 'string',
      description: 'Methode voor berekening bij extreme noorderlijke/zuiderlijke locaties (bijv. Scandinavië in de zomer).',
      options: { list: highLatitudeRules },
      initialValue: 'middleOfTheNight',
      group: 'engine',
    }),

    defineField({
      name: 'adhanOffsets',
      title: 'Adhan Correcties (minuten)',
      type: 'object',
      description: 'Handmatige correcties per gebed (positief = later, negatief = eerder). Standaard: 0.',
      group: 'engine',
      fields: prayerNames.map((name) =>
        defineField({
          name,
          title: name.charAt(0).toUpperCase() + name.slice(1),
          type: 'number',
          initialValue: 0,
        })
      ),
    }),

    // ── Iqama Configuration ──
    defineField({
      name: 'iqamaConfig',
      title: 'Iqama Instellingen',
      type: 'object',
      description: 'Configureer per gebed hoe de Iqama-tijd berekend wordt.',
      group: 'iqama',
      fields: [
        iqamaField('fajr', 'Fajr'),
        iqamaField('dhuhr', 'Dhuhr'),
        iqamaField('asr', 'Asr'),
        iqamaField('maghrib', 'Maghrib'),
        iqamaField('isha', 'Isha'),
      ],
    }),

    // ── Jumu'ah (CMS-managed, niet berekend) ──
    defineField({
      name: 'jumuahShifts',
      title: 'Vrijdaggebed (Jumu\'ah) Diensten',
      type: 'array',
      description: 'Voeg één of meerdere Jumu\'ah diensten toe met tijdstip en eventueel een opmerking.',
      group: 'jumuah',
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
      group: 'jumuah',
    }),

    defineField({
      name: 'footerNote',
      title: 'Disclaimer / Voetnoot',
      type: 'text',
      rows: 3,
      description: 'Kleine tekst onderaan de gebedstijden pagina, bijv. "Tijden kunnen afwijken tijdens Ramadan."',
      group: 'jumuah',
    }),
  ],
  preview: {
    select: { method: 'method', madhab: 'madhab', tz: 'timezone' },
    prepare({ method, madhab, tz }) {
      return {
        title: `Gebedstijden — ${method || '?'} (${madhab || '?'})`,
        subtitle: tz || 'Geen timezone',
      };
    },
  },
});
