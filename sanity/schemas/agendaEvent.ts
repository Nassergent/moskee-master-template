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
        ],
        layout: 'dropdown',
      },
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
      initialValue: true,
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
      media: 'afbeelding',
    },
    prepare({ title, datum, categorieRefTitel, categorie, gepubliceerd, featured, doelgroep, media }) {
      const datumStr = datum
        ? new Date(datum).toLocaleDateString('nl-BE', {
            weekday: 'short',
            day: 'numeric',
            month: 'long',
          })
        : '';
      const prefix = gepubliceerd === false ? '[UIT] ' : '';
      const star = featured ? '⭐ ' : '';
      const cat = categorieRefTitel || categorie || '';
      const doel = doelgroep && doelgroep !== 'Iedereen' ? ` · ${doelgroep}` : '';
      return {
        title: `${star}${prefix}${title || 'Zonder titel'}`,
        subtitle: `${cat}${doel} — ${datumStr}`,
        media,
      };
    },
  },
});
