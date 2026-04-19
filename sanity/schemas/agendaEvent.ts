import { defineType, defineField } from 'sanity';

export const agendaEvent = defineType({
  name: 'agendaEvent',
  title: 'Agenda Evenementen',
  type: 'document',
  groups: [
    { name: 'basis', title: 'Basis', default: true },
    { name: 'uitgelicht', title: 'Uitgelicht' },
    { name: 'media', title: 'Media' },
    { name: 'koppelingen', title: 'Koppelingen' },
    { name: 'reeks', title: 'Reeks' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'titel',
      title: 'Titel',
      type: 'string',
      description: 'Titel van het evenement.',
      validation: (Rule) => Rule.required().max(120),
      group: 'basis',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'URL-pad van het evenement. Klik op "Generate" om te genereren vanuit de titel.',
      options: {
        source: 'titel',
        maxLength: 96,
        slugify: (input: string) =>
          input.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .slice(0, 96),
      },
      group: 'basis',
    }),
    defineField({
      name: 'startDatum',
      title: 'Startdatum & -tijd',
      type: 'datetime',
      description: 'Wanneer begint het evenement?',
      validation: (Rule) => Rule.required(),
      group: 'basis',
    }),
    defineField({
      name: 'eindDatum',
      title: 'Einddatum & -tijd (optioneel)',
      type: 'datetime',
      description: 'Wanneer eindigt het evenement?',
      group: 'basis',
      validation: (Rule) => Rule.custom((eindDatum, context) => {
        const parent = context.parent as { startDatum?: string };
        if (!eindDatum || !parent?.startDatum) return true;
        return new Date(eindDatum) > new Date(parent.startDatum)
          ? true
          : 'Einddatum moet na de startdatum liggen.';
      }),
    }),
    defineField({
      name: 'locatie',
      title: 'Locatie',
      type: 'string',
      description: 'Waar vindt het evenement plaats?',
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
      group: 'basis',
    }),
    defineField({
      name: 'locatieAnders',
      title: 'Locatie (vrij invullen)',
      type: 'string',
      description: 'Bijv. "Grote Moskee van Keulen – Duitsland" of een adres.',
      hidden: ({ parent }) => parent?.locatie !== 'anders',
      group: 'basis',
    }),
    defineField({
      name: 'categorieRef',
      title: 'Categorie',
      type: 'reference',
      to: [{ type: 'eventCategorie' }],
      description: 'Kies een categorie uit het CMS.',
      group: 'basis',
    }),
    defineField({
      name: 'gepubliceerd',
      title: 'Gepubliceerd',
      type: 'boolean',
      description: 'AAN = zichtbaar op de website.',
      initialValue: false,
      group: 'basis',
    }),

    // ── Uitgelicht groep ──
    defineField({
      name: 'featured',
      title: 'Uitgelicht',
      type: 'boolean',
      description: 'AAN = dit evenement wordt prominent bovenaan de agenda getoond.',
      initialValue: false,
      group: 'uitgelicht',
    }),
    defineField({
      name: 'prioriteit',
      title: 'Prioriteit',
      type: 'number',
      description: 'Hogere prioriteit = hoger getoond (1 = hoogst, 10 = laagst).',
      validation: (Rule) => Rule.min(1).max(10),
      hidden: ({ parent }) => !parent?.featured,
      group: 'uitgelicht',
    }),
    defineField({
      name: 'doelgroep',
      title: 'Doelgroep',
      type: 'string',
      description: 'Voor wie is dit evenement bedoeld?',
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
      group: 'uitgelicht',
    }),

    // ── Media groep ──
    defineField({
      name: 'beschrijving',
      title: 'Beschrijving',
      type: 'array',
      of: [
        { type: 'block' },
        { type: 'image', options: { hotspot: true } },
      ],
      description: 'Uitgebreide beschrijving van het evenement (rich text met afbeeldingen).',
      group: 'media',
    }),
    defineField({
      name: 'afbeelding',
      title: 'Afbeelding (optioneel)',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt-tekst',
          type: 'string',
          description: 'Beschrijving voor toegankelijkheid en SEO.',
        }),
      ],
      group: 'media',
    }),

    // ── Koppelingen groep ──
    defineField({
      name: 'onderwerpHub',
      title: 'Hoofdartikel (Topic Hub)',
      type: 'reference',
      to: [{ type: 'post' }],
      description: 'Optioneel: koppel dit evenement aan een hoofdartikel. Het artikel toont dan dit evenement in de "Gerelateerd" sectie.',
      group: 'koppelingen',
    }),
    defineField({
      name: 'registrationOpen',
      title: 'Inschrijving openstellen?',
      type: 'boolean',
      description: 'AAN = bezoekers kunnen zich inschrijven via het formulier op de website.',
      initialValue: false,
      group: 'koppelingen',
    }),
    defineField({
      name: 'registrationMax',
      title: 'Maximum aantal plaatsen',
      type: 'number',
      description: 'Optioneel: beperk het aantal plaatsen. Leeg = onbeperkt.',
      validation: (Rule) => Rule.min(1),
      hidden: ({ parent }) => !parent?.registrationOpen,
      group: 'koppelingen',
    }),
    defineField({
      name: 'registrationDeadline',
      title: 'Inschrijfdeadline',
      type: 'datetime',
      description: 'Optioneel: inschrijving sluit automatisch na deze datum.',
      hidden: ({ parent }) => !parent?.registrationOpen,
      group: 'koppelingen',
    }),
    defineField({
      name: 'externalRegistrationUrl',
      title: 'Externe inschrijflink',
      type: 'url',
      description: 'Backup: link naar bijv. Google Forms. Wordt getoond als het ingebouwde formulier niet actief is.',
      group: 'koppelingen',
    }),

    // ── Reeks (terugkerende events) ──
    defineField({
      name: 'parentSeries',
      title: 'Onderdeel van reeks',
      type: 'reference',
      to: [{ type: 'eventSeries' }],
      description: 'Automatisch ingevuld als dit event gegenereerd is vanuit een terugkerende reeks.',
      readOnly: true,
      hidden: ({ parent }) => !parent?.parentSeries,
      group: 'reeks',
    }),
    defineField({
      name: 'cancelled',
      title: 'Afgelast',
      type: 'boolean',
      description: 'AAN = dit specifieke event gaat niet door (bijv. Ramadan-pauze). Blijft onzichtbaar op de website.',
      initialValue: false,
      group: 'reeks',
    }),

    // ── Oud categorie veld (migratie — verborgen) ──
    defineField({
      name: 'categorie',
      title: 'Categorie (oud)',
      type: 'string',
      hidden: true,
      readOnly: true,
      options: {
        list: [
          { title: 'Gebed', value: 'Gebed' },
          { title: 'Les', value: 'Les' },
          { title: 'Iftar', value: 'Iftar' },
          { title: 'Eid', value: 'Eid' },
          { title: 'Bijeenkomst', value: 'Bijeenkomst' },
          { title: 'Vrijwilligers', value: 'Vrijwilligers' },
          { title: 'Overig', value: 'Overig' },
        ],
        layout: 'dropdown',
      },
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
      title: 'Datum (eerstvolgende eerst)',
      name: 'datumAsc',
      by: [{ field: 'startDatum', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'titel',
      datum: 'startDatum',
      categorieRefTitel: 'categorieRef.titel',
      categorie: 'categorie',
      gepubliceerd: 'gepubliceerd',
      featured: 'featured',
      doelgroep: 'doelgroep',
      cancelled: 'cancelled',
      parentSeries: 'parentSeries',
      media: 'afbeelding',
    },
    prepare({ title, datum, categorieRefTitel, categorie, gepubliceerd, featured, doelgroep, cancelled, parentSeries, media }) {
      const datumStr = datum
        ? new Date(datum).toLocaleDateString('nl-BE', {
            weekday: 'short',
            day: 'numeric',
            month: 'long',
          })
        : '';
      const cancelPrefix = cancelled ? '[AFGELAST] ' : '';
      const prefix = gepubliceerd === false ? '[UIT] ' : '';
      const star = featured ? '⭐ ' : '';
      const series = parentSeries ? '🔁 ' : '';
      const cat = categorieRefTitel || categorie || '';
      const doel = doelgroep && doelgroep !== 'Iedereen' ? ` · ${doelgroep}` : '';
      return {
        title: `${series}${star}${cancelPrefix}${prefix}${title || 'Zonder titel'}`,
        subtitle: `${cat}${doel} — ${datumStr}`,
        media,
      };
    },
  },
});
