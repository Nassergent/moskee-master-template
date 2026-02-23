import { defineType, defineField } from 'sanity';

export const project = defineType({
  name: 'project',
  title: 'Projecten',
  type: 'document',
  fields: [
    defineField({
      name: 'titel',
      title: 'Titel',
      type: 'string',
      description: 'De naam van dit project zoals getoond op de website en donatiepagina.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'beschrijving',
      title: 'Beschrijving',
      type: 'text',
      rows: 4,
      description: 'Korte uitleg over het project. Wordt getoond op de projectenkaart.',
    }),
    defineField({
      name: 'afbeelding',
      title: 'Afbeelding',
      type: 'image',
      description: 'Optionele foto voor de projectkaart. Aanbevolen: liggend formaat, min. 600px breed.',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', title: 'Alt-tekst (SEO)', type: 'string', description: 'Beschrijf de afbeelding voor zoekmachines en slechtzienden.' }),
      ],
    }),
    defineField({
      name: 'doelbedrag',
      title: 'Doelbedrag (€)',
      type: 'number',
      description: 'Het totaalbedrag dat u wilt inzamelen voor dit project.',
    }),
    defineField({
      name: 'huidigBedragCents',
      title: 'Huidig Bedrag (centen)',
      type: 'number',
      initialValue: 0,
      readOnly: true,
      description: 'Automatisch bijgewerkt na een online donatie. Waarde in centen (1750000 = €17.500,00). Niet handmatig aanpassen.',
    }),
    defineField({
      name: 'prijsPerEenheid',
      title: 'Prijs per eenheid (€)',
      type: 'number',
      description: 'Optioneel: bedrag per stuk (bijv. 10 voor "€10 per pakket"). Laat leeg als niet van toepassing.',
    }),
    defineField({
      name: 'eenheid',
      title: 'Eenheid',
      type: 'string',
      description: 'Naam van de eenheid (bijv. "pakket", "maaltijd", "doos"). Wordt getoond als "€10 per pakket".',
    }),
    defineField({
      name: 'citaat',
      title: 'Gekoppeld Citaat',
      type: 'reference',
      to: [{ type: 'quote' }],
      description: 'Optioneel: koppel een islamitisch citaat aan dit project',
    }),
    defineField({
      name: 'toonOpHomepage',
      title: 'Toon op homepage',
      type: 'boolean',
      initialValue: false,
      description: 'Zet aan om dit project te tonen op de homepage. Slechts 1 project wordt getoond — als meerdere zijn aangevinkt, wordt het eerste gekozen.',
    }),
    defineField({
      name: 'actief',
      title: 'Actief',
      type: 'boolean',
      initialValue: true,
      description: 'Alleen actieve projecten zijn zichtbaar op de website en donatiepagina.',
    }),
  ],
  preview: {
    select: { title: 'titel', subtitle: 'doelbedrag', media: 'afbeelding' },
    prepare({ title, subtitle }) {
      return { title, subtitle: subtitle ? `Doel: €${subtitle}` : '' };
    },
  },
});
