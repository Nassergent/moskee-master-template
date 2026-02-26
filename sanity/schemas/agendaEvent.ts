import { defineType, defineField } from 'sanity';

export const agendaEvent = defineType({
  name: 'agendaEvent',
  title: 'Agenda Evenementen',
  type: 'document',
  fields: [
    defineField({
      name: 'titel',
      title: 'Titel',
      type: 'string',
      description: 'Titel van het evenement.',
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
      name: 'startDatum',
      title: 'Startdatum & -tijd',
      type: 'datetime',
      description: 'Wanneer begint het evenement?',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'eindDatum',
      title: 'Einddatum & -tijd (optioneel)',
      type: 'datetime',
      description: 'Wanneer eindigt het evenement?',
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
    }),
    defineField({
      name: 'categorie',
      title: 'Categorie',
      type: 'string',
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
    defineField({
      name: 'beschrijving',
      title: 'Beschrijving',
      type: 'array',
      of: [
        { type: 'block' },
        { type: 'image', options: { hotspot: true } },
      ],
      description: 'Uitgebreide beschrijving van het evenement (rich text met afbeeldingen).',
    }),
    defineField({
      name: 'afbeelding',
      title: 'Afbeelding (optioneel)',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'onderwerpHub',
      title: 'Hoofdartikel (Topic Hub)',
      type: 'reference',
      to: [{ type: 'post' }],
      description: 'Optioneel: koppel dit evenement aan een hoofdartikel. Het artikel toont dan dit evenement in de "Gerelateerd" sectie.',
    }),
    defineField({
      name: 'gepubliceerd',
      title: 'Gepubliceerd',
      type: 'boolean',
      description: 'AAN = zichtbaar op de website.',
      initialValue: true,
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
      categorie: 'categorie',
      gepubliceerd: 'gepubliceerd',
      media: 'afbeelding',
    },
    prepare({ title, datum, categorie, gepubliceerd, media }) {
      const datumStr = datum
        ? new Date(datum).toLocaleDateString('nl-BE', {
            weekday: 'short',
            day: 'numeric',
            month: 'long',
          })
        : '';
      const prefix = gepubliceerd === false ? '[UIT] ' : '';
      return {
        title: `${prefix}${title || 'Zonder titel'}`,
        subtitle: `${categorie || ''} — ${datumStr}`,
        media,
      };
    },
  },
});
