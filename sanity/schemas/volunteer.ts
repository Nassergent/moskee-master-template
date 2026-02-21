import { defineType, defineField } from 'sanity';

export const volunteer = defineType({
  name: 'volunteer',
  title: 'Vrijwilliger',
  type: 'document',
  fields: [
    defineField({
      name: 'naam',
      title: 'Naam',
      type: 'string',
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'email',
      title: 'E-mail',
      type: 'string',
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'telefoon',
      title: 'Telefoon',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'taken',
      title: 'Interesses / Taken',
      type: 'array',
      of: [{ type: 'string' }],
      readOnly: true,
      options: {
        list: [
          { title: 'Koken', value: 'koken' },
          { title: 'Kuisen', value: 'kuisen' },
          { title: 'Onderhoud', value: 'onderhoud' },
          { title: 'Evenementen', value: 'evenementen' },
          { title: 'Educatie', value: 'educatie' },
          { title: 'Administratie', value: 'administratie' },
        ],
      },
    }),
    defineField({
      name: 'bericht',
      title: 'Bericht',
      type: 'text',
      readOnly: true,
    }),
    defineField({
      name: 'aanmeldDatum',
      title: 'Aanmelddatum',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Nieuw', value: 'nieuw' },
          { title: 'Gecontacteerd', value: 'gecontacteerd' },
          { title: 'Actief', value: 'actief' },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      initialValue: 'nieuw',
    }),
  ],
  orderings: [
    {
      title: 'Aanmelddatum (nieuwste eerst)',
      name: 'aanmeldDatumDesc',
      by: [{ field: 'aanmeldDatum', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'naam', subtitle: 'status' },
    prepare({ title, subtitle }) {
      const labels: Record<string, string> = { nieuw: 'Nieuw', gecontacteerd: 'Gecontacteerd', actief: 'Actief' };
      return { title: title || 'Geen naam', subtitle: labels[subtitle] || subtitle };
    },
  },
});
