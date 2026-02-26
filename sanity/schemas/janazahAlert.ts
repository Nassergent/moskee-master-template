import { defineType, defineField } from 'sanity';

export const janazahAlert = defineType({
  name: 'janazahAlert',
  title: 'Janazah Melding',
  type: 'document',
  fields: [
    defineField({
      name: 'naamOverledene',
      title: 'Naam Overledene',
      type: 'string',
      description: 'Wordt alleen getoond als de familie toestemming geeft (zie vinkje hieronder).',
    }),
    defineField({
      name: 'naGebed',
      title: 'Na welk gebed?',
      type: 'string',
      description: 'Het gebed waarna de janazah plaatsvindt.',
      options: {
        list: [
          { title: 'Fajr-gebed', value: 'Fajr-gebed' },
          { title: 'Dhuhr-gebed', value: 'Dhuhr-gebed' },
          { title: 'Asr-gebed', value: 'Asr-gebed' },
          { title: 'Maghrib-gebed', value: 'Maghrib-gebed' },
          { title: 'Isha-gebed', value: 'Isha-gebed' },
          { title: "Jumu'ah-gebed", value: "Jumu'ah-gebed" },
        ],
      },
    }),
    defineField({
      name: 'gebedstijdstip',
      title: 'Tijdstip',
      type: 'string',
      description: 'Alleen het uur, bijv. 14:00',
    }),
    defineField({
      name: 'gebeddatum',
      title: 'Datum Janazah-gebed',
      type: 'date',
      description: 'Datum waarop het gebed plaatsvindt.',
    }),
    defineField({
      name: 'duaArabisch',
      title: 'Dua (Arabisch)',
      type: 'string',
      description: 'Optionele Arabische dua-tekst, bijv. een specifieke smeekbede.',
    }),
    defineField({
      name: 'familyConsent',
      title: 'Toestemming Familie',
      type: 'boolean',
      description: 'AAN = naam wordt getoond op de website. UIT = anonieme melding.',
      initialValue: false,
    }),
    defineField({
      name: 'actief',
      title: 'Actief op Homepage',
      type: 'boolean',
      description: 'AAN = melding wordt getoond op de homepage. Zet UIT na afloop van het gebed.',
      initialValue: false,
    }),
  ],
  orderings: [
    { title: 'Datum (nieuwste)', name: 'datumDesc', by: [{ field: 'gebeddatum', direction: 'desc' }] },
  ],
  preview: {
    select: {
      naam: 'naamOverledene',
      datum: 'gebeddatum',
      actief: 'actief',
      consent: 'familyConsent',
    },
    prepare({ naam, datum, actief, consent }) {
      const prefix = actief ? '[ACTIEF] ' : '';
      const displayName = consent && naam ? naam : 'Gemeentelid';
      const datumStr = datum
        ? new Date(datum + 'T00:00:00').toLocaleDateString('nl-BE', { day: 'numeric', month: 'long' })
        : '';
      return {
        title: `${prefix}${displayName}`,
        subtitle: datumStr ? `Janazah: ${datumStr}` : 'Geen datum',
      };
    },
  },
});
