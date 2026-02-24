import { defineType, defineField } from 'sanity';

export const aboutPage = defineType({
  name: 'aboutPage',
  title: 'Over Ons Pagina',
  type: 'document',
  groups: [
    { name: 'hero', title: 'Hero & Introductie', default: true },
    { name: 'missie', title: 'Onze Missie' },
    { name: 'kengetallen', title: 'Kengetallen' },
    { name: 'geschiedenis', title: 'Geschiedenis' },
    { name: 'waarden', title: 'Onze Waarden' },
    { name: 'team', title: 'Bestuur & Team' },
    { name: 'vrijwilliger', title: 'Vrijwilligers' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    // ── Hero & Introductie ──────────────────────────────────
    defineField({
      name: 'heroTitle',
      title: 'Hero Titel',
      type: 'string',
      group: 'hero',
      description: 'Grote titel in de hero-sectie. Bijv. "Over Ons" of "Wie Zijn Wij?"',
      validation: (rule) => rule.max(60),
    }),
    defineField({
      name: 'heroSubtitle',
      title: 'Hero Ondertitel',
      type: 'text',
      rows: 2,
      group: 'hero',
      description: 'Korte ondertitel onder de hero-titel (max 160 tekens)',
      validation: (rule) => rule.max(160),
    }),

    // ── Onze Missie ─────────────────────────────────────────
    defineField({
      name: 'missieTitle',
      title: 'Missie Titel',
      type: 'string',
      group: 'missie',
      description: 'Bijv. "Onze Missie", "Wie zijn wij?"',
    }),
    defineField({
      name: 'missieText',
      title: 'Missie Tekst',
      type: 'array',
      of: [{ type: 'block' }],
      group: 'missie',
      description: 'Hou dit kort en krachtig — max 2-3 alinea\'s. Gebruik de Geschiedenis-tab voor uitgebreide tijdlijnen.',
    }),
    defineField({
      name: 'missieImage',
      title: 'Missie Afbeelding',
      type: 'image',
      options: { hotspot: true },
      group: 'missie',
      description: 'Wordt getoond in 4:3 verhouding naast de missietekst. Tip: upload een liggende foto.',
    }),

    // ── Kengetallen ─────────────────────────────────────────
    defineField({
      name: 'kengetallenTonen',
      title: 'Kengetallen tonen?',
      type: 'boolean',
      group: 'kengetallen',
      description: 'Toon een rij met kerngetallen (bijv. "500+ leden", "30 jaar")',
      initialValue: false,
    }),
    defineField({
      name: 'kengetallen',
      title: 'Kengetallen',
      type: 'array',
      group: 'kengetallen',
      description: 'Maximaal 4 kengetallen',
      validation: (rule) => rule.max(4),
      hidden: ({ parent }) => !parent?.kengetallenTonen,
      of: [
        {
          type: 'object',
          name: 'kengetal',
          fields: [
            defineField({
              name: 'waarde',
              title: 'Waarde',
              type: 'string',
              description: 'Bijv. "500+", "30", "1994"',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description: 'Bijv. "Leden", "Jaar actief", "Opgericht"',
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: { title: 'waarde', subtitle: 'label' },
          },
        },
      ],
    }),

    // ── Geschiedenis ────────────────────────────────────────
    defineField({
      name: 'geschiedenisTonen',
      title: 'Geschiedenis tonen?',
      type: 'boolean',
      group: 'geschiedenis',
      description: 'Toon een tijdlijn met belangrijke momenten',
      initialValue: false,
    }),
    defineField({
      name: 'geschiedenisTitle',
      title: 'Geschiedenis Titel',
      type: 'string',
      group: 'geschiedenis',
      description: 'Bijv. "Onze Geschiedenis", "Ons Verhaal"',
      hidden: ({ parent }) => !parent?.geschiedenisTonen,
    }),
    defineField({
      name: 'tijdlijn',
      title: 'Tijdlijn',
      type: 'array',
      group: 'geschiedenis',
      description: 'Maximaal 10 momenten, chronologisch',
      validation: (rule) => rule.max(10),
      hidden: ({ parent }) => !parent?.geschiedenisTonen,
      of: [
        {
          type: 'object',
          name: 'tijdlijnItem',
          fields: [
            defineField({
              name: 'jaar',
              title: 'Jaar',
              type: 'string',
              description: 'Bijv. "1994", "2010", "Heden"',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'titel',
              title: 'Titel',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'beschrijving',
              title: 'Beschrijving',
              type: 'text',
              rows: 2,
              description: 'Kort en bondig (max 200 tekens)',
              validation: (rule) => rule.max(200),
            }),
          ],
          preview: {
            select: { title: 'jaar', subtitle: 'titel' },
            prepare({ title, subtitle }) {
              return { title: `${title} — ${subtitle}` };
            },
          },
        },
      ],
    }),

    // ── Onze Waarden ────────────────────────────────────────
    defineField({
      name: 'waardenTonen',
      title: 'Waarden tonen?',
      type: 'boolean',
      group: 'waarden',
      description: 'Toon de waarden-sectie op de Over Ons pagina',
      initialValue: true,
    }),
    defineField({
      name: 'waardenTitle',
      title: 'Waarden Titel',
      type: 'string',
      group: 'waarden',
      description: 'Bijv. "Onze Waarden", "Waar wij voor staan"',
      hidden: ({ parent }) => !parent?.waardenTonen,
    }),
    defineField({
      name: 'waarden',
      title: 'Waarden',
      type: 'array',
      group: 'waarden',
      description: 'Maximaal 6 waarden',
      validation: (rule) => rule.max(6),
      hidden: ({ parent }) => !parent?.waardenTonen,
      of: [
        {
          type: 'object',
          name: 'waarde',
          fields: [
            defineField({
              name: 'title',
              title: 'Titel',
              type: 'string',
              validation: (rule) => rule.required().max(30),
            }),
            defineField({
              name: 'description',
              title: 'Beschrijving',
              type: 'text',
              rows: 2,
              validation: (rule) => rule.max(120),
            }),
          ],
          preview: {
            select: { title: 'title', subtitle: 'description' },
          },
        },
      ],
    }),

    // ── Bestuur & Team ──────────────────────────────────────
    defineField({
      name: 'teamTonen',
      title: 'Team tonen?',
      type: 'boolean',
      group: 'team',
      description: 'Toon de team-sectie op de Over Ons pagina',
      initialValue: true,
    }),
    defineField({
      name: 'teamTitle',
      title: 'Team Titel',
      type: 'string',
      group: 'team',
      description: 'Bijv. "Bestuur & Team", "Ons Bestuur"',
      hidden: ({ parent }) => !parent?.teamTonen,
    }),
    defineField({
      name: 'team',
      title: 'Teamleden',
      type: 'array',
      group: 'team',
      description: 'Maximaal 12 teamleden',
      validation: (rule) => rule.max(12),
      hidden: ({ parent }) => !parent?.teamTonen,
      of: [
        {
          type: 'object',
          name: 'teamlid',
          fields: [
            defineField({
              name: 'naam',
              title: 'Naam',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'functie',
              title: 'Functie',
              type: 'string',
            }),
            defineField({
              name: 'foto',
              title: 'Foto',
              type: 'image',
              options: { hotspot: true },
              description: 'Vierkante foto werkt het best',
            }),
          ],
          preview: {
            select: { title: 'naam', subtitle: 'functie', media: 'foto' },
          },
        },
      ],
    }),

    // ── Vrijwilligers ───────────────────────────────────────
    defineField({
      name: 'vrijwilligerTonen',
      title: 'Vrijwilligers-sectie tonen?',
      type: 'boolean',
      group: 'vrijwilliger',
      description: 'Toon de vrijwilligers-sectie met aanmeldformulier',
      initialValue: true,
    }),
    defineField({
      name: 'vrijwilligerTitle',
      title: 'Vrijwilligers Titel',
      type: 'string',
      group: 'vrijwilliger',
      description: 'Bijv. "Word Vrijwilliger", "Help Mee"',
      hidden: ({ parent }) => !parent?.vrijwilligerTonen,
    }),
    defineField({
      name: 'vrijwilligerText',
      title: 'Vrijwilligers Tekst',
      type: 'text',
      rows: 3,
      group: 'vrijwilliger',
      description: 'Korte oproep (max 200 tekens)',
      validation: (rule) => rule.max(200),
      hidden: ({ parent }) => !parent?.vrijwilligerTonen,
    }),

    // ── SEO ─────────────────────────────────────────────────
    defineField({
      name: 'seoTitle',
      title: 'SEO Titel',
      type: 'string',
      group: 'seo',
      description: 'Overschrijf de paginatitel voor zoekmachines (max 70 tekens)',
      validation: (rule) => rule.max(70),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO Beschrijving',
      type: 'text',
      rows: 2,
      group: 'seo',
      description: 'Overschrijf de meta-beschrijving voor Google (max 160 tekens)',
      validation: (rule) => rule.max(160),
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Over Ons Pagina' };
    },
  },
});
