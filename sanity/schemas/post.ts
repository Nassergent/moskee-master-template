import { defineType, defineField } from 'sanity';

export const post = defineType({
  name: 'post',
  title: 'Nieuws & Blog',
  type: 'document',
  fields: [
    defineField({
      name: 'titel',
      title: 'Titel',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'titel', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'datum',
      title: 'Publicatiedatum',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'samenvatting',
      title: 'Samenvatting',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'afbeelding',
      title: 'Afbeelding',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'inhoud',
      title: 'Inhoud',
      type: 'array',
      of: [
        { type: 'block' },
        { type: 'image', options: { hotspot: true } },
      ],
    }),
    defineField({
      name: 'gepubliceerd',
      title: 'Gepubliceerd',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  orderings: [
    { title: 'Datum (nieuwste)', name: 'datumDesc', by: [{ field: 'datum', direction: 'desc' }] },
  ],
  preview: {
    select: { title: 'titel', subtitle: 'datum', media: 'afbeelding' },
  },
});
