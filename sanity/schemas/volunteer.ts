import { defineType, defineField } from 'sanity';

export const volunteer = defineType({
  name: 'volunteer',
  title: 'Vrijwilligers',
  type: 'document',
  groups: [
    { name: 'info', title: 'Gegevens', default: true },
    { name: 'beheer', title: 'Beheer' },
  ],
  fields: [
    // === GEGEVENS (read-only, vanuit formulier) ===
    defineField({
      name: 'naam',
      title: 'Naam',
      type: 'string',
      readOnly: true,
      group: 'info',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'email',
      title: 'E-mail',
      type: 'string',
      readOnly: true,
      group: 'info',
      validation: (rule) => rule.required().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { name: 'e-mail', invert: false }).error('Voer een geldig e-mailadres in.'),
    }),
    defineField({
      name: 'telefoon',
      title: 'Telefoon',
      type: 'string',
      readOnly: true,
      group: 'info',
    }),
    defineField({
      name: 'taken',
      title: 'Gekozen Taken',
      type: 'array',
      of: [{ type: 'string' }],
      readOnly: true,
      group: 'info',
      description: 'De taken die deze persoon heeft gekozen bij aanmelding.',
    }),
    defineField({
      name: 'bericht',
      title: 'Bericht van vrijwilliger',
      type: 'text',
      readOnly: true,
      group: 'info',
    }),
    defineField({
      name: 'aanmeldDatum',
      title: 'Aanmelddatum',
      type: 'datetime',
      readOnly: true,
      group: 'info',
    }),

    // === BEHEER (bewerkbaar door Imam/coördinator) ===
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'beheer',
      options: {
        list: [
          { title: '🆕 Nieuwe Aanmelding', value: 'nieuw' },
          { title: '📞 Gecontacteerd', value: 'gecontacteerd' },
          { title: '✅ Actief', value: 'actief' },
          { title: '❌ Inactief', value: 'inactief' },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      initialValue: 'nieuw',
      description: 'Wijzig de status zodra u contact heeft opgenomen met een nieuwe vrijwilliger.',
    }),
    defineField({
      name: 'interneNotities',
      title: 'Interne Notities',
      type: 'text',
      rows: 5,
      group: 'beheer',
      description: 'Gespreksverslagen, opmerkingen of afspraken. Dit is NIET zichtbaar op de website.',
    }),
  ],
  orderings: [
    {
      title: 'Aanmelddatum (nieuwste eerst)',
      name: 'aanmeldDatumDesc',
      by: [{ field: 'aanmeldDatum', direction: 'desc' }],
    },
    {
      title: 'Status',
      name: 'statusAsc',
      by: [{ field: 'status', direction: 'asc' }],
    },
  ],
  preview: {
    select: { title: 'naam', status: 'status', telefoon: 'telefoon', taken: 'taken' },
    prepare({ title, status, telefoon, taken }) {
      const statusMap: Record<string, string> = {
        nieuw: '🆕',
        gecontacteerd: '📞',
        actief: '✅',
        inactief: '❌',
      };
      const badge = statusMap[status] || '🆕';
      const takenStr = Array.isArray(taken) && taken.length > 0
        ? taken.join(', ')
        : '';
      const telStr = telefoon ? ` | 📱 ${telefoon}` : '';
      return {
        title: `${badge} ${title || 'Geen naam'}${telStr}`,
        subtitle: takenStr,
      };
    },
  },
});
