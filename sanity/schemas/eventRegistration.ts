import { defineType, defineField } from 'sanity';

export const eventRegistration = defineType({
  name: 'eventRegistration',
  title: 'Evenement Inschrijvingen',
  type: 'document',
  groups: [
    { name: 'info', title: 'Gegevens', default: true },
    { name: 'beheer', title: 'Beheer' },
  ],
  fields: [
    // === GEGEVENS ===
    defineField({
      name: 'eventRef',
      title: 'Evenement',
      type: 'reference',
      to: [{ type: 'agendaEvent' }],
      readOnly: true,
      group: 'info',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'name',
      title: 'Naam',
      type: 'string',
      group: 'info',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'email',
      title: 'E-mail',
      type: 'string',
      group: 'info',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'phone',
      title: 'Telefoon',
      type: 'string',
      group: 'info',
    }),
    defineField({
      name: 'partySize',
      title: 'Aantal personen',
      type: 'number',
      group: 'info',
      initialValue: 1,
      validation: (rule) => rule.min(1).max(20),
    }),
    defineField({
      name: 'notes',
      title: 'Opmerkingen',
      type: 'text',
      rows: 3,
      group: 'info',
      description: 'Bijv. dieetwensen, vervoer, bijzonderheden.',
    }),
    defineField({
      name: 'createdAt',
      title: 'Inschrijfdatum',
      type: 'datetime',
      readOnly: true,
      group: 'info',
    }),

    // === BEHEER ===
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'beheer',
      options: {
        list: [
          { title: '📩 Ingediend', value: 'submitted' },
          { title: '❌ Geannuleerd', value: 'cancelled' },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      initialValue: 'submitted',
    }),
    defineField({
      name: 'internalNotes',
      title: 'Interne Notities',
      type: 'text',
      rows: 5,
      group: 'beheer',
      description: 'Alleen zichtbaar in het CMS, NIET op de website.',
    }),
  ],
  orderings: [
    {
      title: 'Inschrijfdatum (nieuwste eerst)',
      name: 'createdAtDesc',
      by: [{ field: 'createdAt', direction: 'desc' }],
    },
    {
      title: 'Status',
      name: 'statusAsc',
      by: [{ field: 'status', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      name: 'name',
      eventTitle: 'eventRef.titel',
      partySize: 'partySize',
      status: 'status',
    },
    prepare({ name, eventTitle, partySize, status }) {
      const statusMap: Record<string, string> = {
        submitted: '📩',
        cancelled: '❌',
      };
      const badge = statusMap[status] || '📩';
      return {
        title: `${badge} ${name || 'Geen naam'} | ${eventTitle || 'Geen evenement'}`,
        subtitle: `${partySize || 1} personen`,
      };
    },
  },
});
