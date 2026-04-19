import { defineType, defineField } from 'sanity';

export const eventSeries = defineType({
  name: 'eventSeries',
  title: 'Terugkerende Reeks',
  type: 'document',
  groups: [
    { name: 'basis', title: 'Basis', default: true },
    { name: 'herhaling', title: 'Herhaling' },
    { name: 'defaults', title: 'Standaard-velden' },
    { name: 'media', title: 'Media' },
  ],
  fields: [
    defineField({
      name: 'titel',
      title: 'Titel van de reeks',
      type: 'string',
      description: 'Bijv. "Wekelijkse lezing — De Verzegelde Nectar". Deze titel wordt per instance hergebruikt.',
      validation: (Rule) => Rule.required().max(120),
      group: 'basis',
    }),
    defineField({
      name: 'slug',
      title: 'Slug-basis',
      type: 'slug',
      description: 'URL-basis. Per instance wordt de datum toegevoegd (bijv. "wekelijkse-lezing-2026-04-22").',
      options: {
        source: 'titel',
        maxLength: 80,
        slugify: (input: string) =>
          input.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .slice(0, 80),
      },
      validation: (Rule) => Rule.required(),
      group: 'basis',
    }),
    defineField({
      name: 'actief',
      title: 'Reeks actief',
      type: 'boolean',
      description: 'UIT = de generator is uitgeschakeld; bestaande instances blijven wel staan.',
      initialValue: true,
      group: 'basis',
    }),

    // ── Herhaling ──
    defineField({
      name: 'frequentie',
      title: 'Frequentie',
      type: 'string',
      description: 'Hoe vaak herhaalt deze reeks?',
      options: {
        list: [
          { title: 'Wekelijks', value: 'weekly' },
          { title: 'Tweewekelijks', value: 'biweekly' },
          { title: 'Maandelijks', value: 'monthly' },
        ],
        layout: 'radio',
      },
      initialValue: 'weekly',
      validation: (Rule) => Rule.required(),
      group: 'herhaling',
    }),
    defineField({
      name: 'dagVanDeWeek',
      title: 'Dag van de week',
      type: 'string',
      description: 'Alleen voor wekelijks/tweewekelijks.',
      options: {
        list: [
          { title: 'Maandag', value: 'MO' },
          { title: 'Dinsdag', value: 'TU' },
          { title: 'Woensdag', value: 'WE' },
          { title: 'Donderdag', value: 'TH' },
          { title: 'Vrijdag', value: 'FR' },
          { title: 'Zaterdag', value: 'SA' },
          { title: 'Zondag', value: 'SU' },
        ],
        layout: 'dropdown',
      },
      hidden: ({ parent }) => parent?.frequentie === 'monthly',
      group: 'herhaling',
    }),
    defineField({
      name: 'dagVanDeMaand',
      title: 'Dag van de maand',
      type: 'number',
      description: 'Alleen voor maandelijks (1-28 aanbevolen voor betrouwbaarheid).',
      validation: (Rule) => Rule.min(1).max(31),
      hidden: ({ parent }) => parent?.frequentie !== 'monthly',
      group: 'herhaling',
    }),
    defineField({
      name: 'startTijd',
      title: 'Starttijd',
      type: 'string',
      description: 'Formaat: HH:MM (bijv. "19:00").',
      validation: (Rule) => Rule.required().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { name: 'HH:MM' }),
      group: 'herhaling',
    }),
    defineField({
      name: 'eindTijd',
      title: 'Eindtijd (optioneel)',
      type: 'string',
      description: 'Formaat: HH:MM. Leeg = geen eindtijd.',
      validation: (Rule) => Rule.regex(/^([01]\d|2[0-3]):[0-5]\d$/, { name: 'HH:MM' }).optional(),
      group: 'herhaling',
    }),
    defineField({
      name: 'startDatum',
      title: 'Eerste datum',
      type: 'date',
      description: 'Vanaf wanneer begint de reeks?',
      validation: (Rule) => Rule.required(),
      group: 'herhaling',
    }),
    defineField({
      name: 'eindDatum',
      title: 'Laatste datum',
      type: 'date',
      description: 'Tot wanneer loopt de reeks? Alle instances worden vooraf aangemaakt.',
      validation: (Rule) => Rule.required().custom((eindDatum, context) => {
        const parent = context.parent as { startDatum?: string };
        if (!eindDatum || !parent?.startDatum) return true;
        return new Date(eindDatum) > new Date(parent.startDatum)
          ? true
          : 'Laatste datum moet na de eerste datum liggen.';
      }),
      group: 'herhaling',
    }),

    // ── Standaard-velden (overerfd per instance) ──
    defineField({
      name: 'locatie',
      title: 'Locatie',
      type: 'string',
      options: {
        list: [
          { title: 'Gebedsruimte', value: 'Gebedsruimte' },
          { title: 'Grote zaal', value: 'Grote zaal' },
          { title: 'Leslokaal', value: 'Leslokaal' },
          { title: 'Parking', value: 'Parking' },
          { title: 'Online', value: 'Online' },
          { title: 'Vrouwenruimte', value: 'Vrouwenruimte' },
          { title: 'Anders (vul hieronder in)', value: 'anders' },
        ],
        layout: 'dropdown',
      },
      group: 'defaults',
    }),
    defineField({
      name: 'locatieAnders',
      title: 'Locatie (vrij invullen)',
      type: 'string',
      hidden: ({ parent }) => parent?.locatie !== 'anders',
      group: 'defaults',
    }),
    defineField({
      name: 'categorieRef',
      title: 'Categorie',
      type: 'reference',
      to: [{ type: 'eventCategorie' }],
      group: 'defaults',
    }),
    defineField({
      name: 'doelgroep',
      title: 'Doelgroep',
      type: 'string',
      options: {
        list: [
          { title: 'Iedereen', value: 'Iedereen' },
          { title: 'Mannen', value: 'Mannen' },
          { title: 'Vrouwen', value: 'Vrouwen' },
          { title: 'Jeugd', value: 'Jeugd' },
          { title: 'Kinderen', value: 'Kinderen' },
          { title: 'Senioren', value: 'Senioren' },
        ],
        layout: 'dropdown',
      },
      group: 'defaults',
    }),
    defineField({
      name: 'gepubliceerd',
      title: 'Instances meteen publiceren',
      type: 'boolean',
      description: 'AAN = nieuwe instances verschijnen direct op de website.',
      initialValue: false,
      group: 'defaults',
    }),
    defineField({
      name: 'beschrijving',
      title: 'Beschrijving',
      type: 'array',
      of: [
        { type: 'block' },
        { type: 'image', options: { hotspot: true } },
      ],
      description: 'Gedeelde beschrijving voor alle instances. Per instance overrulebaar.',
      group: 'media',
    }),
    defineField({
      name: 'afbeelding',
      title: 'Afbeelding',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt-tekst',
          type: 'string',
        }),
      ],
      group: 'media',
    }),
  ],
  preview: {
    select: {
      title: 'titel',
      frequentie: 'frequentie',
      dagWeek: 'dagVanDeWeek',
      dagMaand: 'dagVanDeMaand',
      startTijd: 'startTijd',
      actief: 'actief',
      media: 'afbeelding',
    },
    prepare({ title, frequentie, dagWeek, dagMaand, startTijd, actief, media }) {
      const dagLabels: Record<string, string> = {
        MO: 'ma', TU: 'di', WE: 'wo', TH: 'do', FR: 'vr', SA: 'za', SU: 'zo',
      };
      const freqLabels: Record<string, string> = {
        weekly: 'Elke',
        biweekly: 'Om de 2 weken',
        monthly: 'Elke maand op dag',
      };
      const freq = freqLabels[frequentie] || '';
      const dag = frequentie === 'monthly'
        ? (dagMaand ? `${dagMaand}` : '?')
        : (dagWeek ? dagLabels[dagWeek] : '?');
      const tijd = startTijd ? ` om ${startTijd}` : '';
      const prefix = actief === false ? '[UIT] ' : '🔁 ';
      return {
        title: `${prefix}${title || 'Zonder titel'}`,
        subtitle: `${freq} ${dag}${tijd}`,
        media,
      };
    },
  },
});
