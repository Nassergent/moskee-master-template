import { defineType, defineField } from 'sanity';

// Slot-velden voor elke card positie
const cardSlotFields = (position: string) => [
  defineField({
    name: 'variant',
    title: 'Card type',
    type: 'string',
    options: {
      list: [
        { title: 'Evenement / Countdown', value: 'evenementCountdown' },
        { title: 'Donatie Campagne', value: 'donatieCampagne' },
        { title: 'Download', value: 'download' },
        { title: 'Aangepast (vrij)', value: 'aangepast' },
      ],
      layout: 'radio',
    },
  }),
  defineField({
    name: 'ingeschakeld',
    title: 'Card ingeschakeld',
    type: 'boolean',
    initialValue: true,
  }),

  // ── Variant: Evenement / Countdown ──
  defineField({
    name: 'evenementTitel',
    title: 'Evenement titel',
    type: 'string',
    hidden: ({ parent }) => parent?.variant !== 'evenementCountdown',
  }),
  defineField({
    name: 'evenementTitelArabisch',
    title: 'Arabische titel',
    type: 'string',
    hidden: ({ parent }) => parent?.variant !== 'evenementCountdown',
  }),
  defineField({
    name: 'evenementBeschrijving',
    title: 'Beschrijving',
    type: 'text',
    rows: 2,
    hidden: ({ parent }) => parent?.variant !== 'evenementCountdown',
  }),
  defineField({
    name: 'evenementDatum',
    title: 'Datum evenement (voor countdown)',
    type: 'date',
    hidden: ({ parent }) => parent?.variant !== 'evenementCountdown',
  }),
  defineField({
    name: 'agendaLink',
    title: 'Link naar agenda',
    type: 'url',
    validation: (rule) => rule.uri({ allowRelative: true, scheme: ['http', 'https'] }),
    hidden: ({ parent }) => parent?.variant !== 'evenementCountdown',
  }),
  defineField({
    name: 'komendeDatumsFallback',
    title: 'Komende datums (handmatig, alleen als API niet beschikbaar)',
    type: 'array',
    of: [
      {
        type: 'object',
        fields: [
          defineField({ name: 'naam', title: 'Naam', type: 'string' }),
          defineField({ name: 'naamArabisch', title: 'Naam (Arabisch)', type: 'string' }),
          defineField({ name: 'datum', title: 'Datum', type: 'date' }),
        ],
      },
    ],
    hidden: ({ parent }) => parent?.variant !== 'evenementCountdown',
  }),

  // ── Variant: Donatie Campagne (reference) ──
  defineField({
    name: 'donatieProject',
    title: 'Donatie project',
    type: 'reference',
    to: [{ type: 'project' }],
    description: 'Kies het project dat op deze kaart getoond wordt. De voortgangsbalk werkt automatisch.',
    hidden: ({ parent }) => parent?.variant !== 'donatieCampagne',
  }),
  defineField({
    name: 'donatieCtaLabelOverride',
    title: 'Knop tekst (optioneel, standaard: "Steun dit doel")',
    type: 'string',
    description: 'Laat leeg voor standaard "Steun dit doel".',
    hidden: ({ parent }) => parent?.variant !== 'donatieCampagne',
  }),

  // ── Variant: Download ──
  defineField({
    name: 'downloadTitel',
    title: 'Download titel',
    type: 'string',
    hidden: ({ parent }) => parent?.variant !== 'download',
  }),
  defineField({
    name: 'downloadBeschrijving',
    title: 'Download beschrijving',
    type: 'text',
    rows: 2,
    hidden: ({ parent }) => parent?.variant !== 'download',
  }),
  defineField({
    name: 'downloadAfbeelding',
    title: 'Preview afbeelding',
    type: 'image',
    hidden: ({ parent }) => parent?.variant !== 'download',
    fields: [
      defineField({
        name: 'alt',
        title: 'Alt-tekst',
        type: 'string',
        description: 'Beschrijving voor toegankelijkheid en SEO.',
      }),
    ],
  }),
  defineField({
    name: 'downloadBestand',
    title: 'Bestand (PDF/afbeelding)',
    type: 'file',
    hidden: ({ parent }) => parent?.variant !== 'download',
  }),
  defineField({
    name: 'downloadCtaLabel',
    title: 'Knop tekst',
    type: 'string',
    initialValue: 'Download',
    hidden: ({ parent }) => parent?.variant !== 'download',
  }),

  // ── Variant: Aangepast (vrij) ──
  defineField({
    name: 'aangepastTitel',
    title: 'Titel',
    type: 'string',
    hidden: ({ parent }) => parent?.variant !== 'aangepast',
  }),
  defineField({
    name: 'aangepastBeschrijving',
    title: 'Beschrijving',
    type: 'text',
    rows: 3,
    hidden: ({ parent }) => parent?.variant !== 'aangepast',
  }),
  defineField({
    name: 'aangepastAfbeelding',
    title: 'Afbeelding',
    type: 'image',
    options: { hotspot: true },
    hidden: ({ parent }) => parent?.variant !== 'aangepast',
    fields: [
      defineField({
        name: 'alt',
        title: 'Alt-tekst',
        type: 'string',
        description: 'Beschrijving voor toegankelijkheid en SEO.',
      }),
    ],
  }),
  defineField({
    name: 'aangepastCtaLabel',
    title: 'Knop tekst',
    type: 'string',
    hidden: ({ parent }) => parent?.variant !== 'aangepast',
  }),
  defineField({
    name: 'aangepastCtaUrl',
    title: 'Knop link',
    type: 'url',
    validation: (rule) => rule.uri({ allowRelative: true, scheme: ['http', 'https'] }),
    hidden: ({ parent }) => parent?.variant !== 'aangepast',
  }),
];

export const homeCards = defineType({
  name: 'homeCards',
  title: 'Home Kaarten',
  type: 'document',
  groups: [
    { name: 'instellingen', title: 'Instellingen', default: true },
  ],
  fields: [
    defineField({
      name: 'ingeschakeld',
      title: 'Sectie ingeschakeld',
      type: 'boolean',
      initialValue: true,
      description: 'Schakel de volledige 3-kaarten sectie op de homepage in/uit.',
      group: 'instellingen',
    }),
    defineField({
      name: 'card1',
      title: 'Kaart 1 (links)',
      type: 'object',
      fields: cardSlotFields('1'),
    }),
    defineField({
      name: 'card2',
      title: 'Kaart 2 (midden)',
      type: 'object',
      fields: cardSlotFields('2'),
    }),
    defineField({
      name: 'card3',
      title: 'Kaart 3 (rechts)',
      type: 'object',
      fields: cardSlotFields('3'),
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Home Kaarten' };
    },
  },
});
