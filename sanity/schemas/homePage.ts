import { defineType, defineField } from 'sanity';

export const homePage = defineType({
  name: 'homePage',
  title: 'Home Pagina',
  type: 'document',
  fields: [
    defineField({
      name: 'heroTitle',
      title: 'Welkomsttekst boven moskeenaam',
      type: 'string',
      description: 'Dit verschijnt boven de moskeenaam op de homepage (bijv. "Welkom bij"). De moskeenaam zelf staat bij Site Instellingen.',
      validation: (rule) => rule.max(100),
    }),
    defineField({
      name: 'heroSubtitle',
      title: 'Beschrijving onder moskeenaam',
      type: 'text',
      rows: 3,
      description: 'De korte tekst die bezoekers als eerste lezen onder de moskeenaam. Als dit leeg is, wordt de "Korte Beschrijving" uit Site Instellingen gebruikt.',
    }),
    defineField({
      name: 'heroCta',
      title: 'Primaire Knoptekst',
      type: 'string',
      description: 'Tekst op de primaire knop (bijv. "Gebedstijden bekijken")',
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero Afbeelding',
      type: 'image',
      options: { hotspot: true },
      description: 'De grote afbeelding rechts in de hero sectie',
      fields: [
        defineField({ name: 'alt', title: 'Alt-tekst (SEO)', type: 'string', description: 'Beschrijf de afbeelding voor zoekmachines en slechtzienden.' }),
      ],
    }),
    defineField({
      name: 'toonActueel',
      title: 'Toon "Actueel" sectie',
      type: 'boolean',
      initialValue: true,
      description: 'Schakel de actueel sectie op de homepage in/uit',
    }),
    defineField({
      name: 'badgeKleur',
      title: 'Badge Kleur',
      type: 'string',
      initialValue: '#593B1D',
      description: 'De kleur van de welkom-badges. Formaat: #RRGGBB (bijv. #593B1D voor bruin, #1D5C6B voor blauw, #D4AF37 voor goud)',
      validation: (rule) => rule.regex(/^#[0-9A-Fa-f]{6}$/, { name: 'hex kleur', invert: false }).error('Voer een geldige hex kleur in (bijv. #593B1D)'),
    }),
    defineField({
      name: 'badges',
      title: 'Welkom Badges',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Welkomstwoorden in verschillende talen (bijv. "Allen Welkom", "All Welcome")',
    }),
    defineField({
      name: 'seoTitle',
      title: 'SEO Titel',
      type: 'string',
      description: 'Optioneel: overschrijf de paginatitel voor zoekmachines (bijv. "Moskee Al-Nour Gent — Gebedstijden & Gemeenschap"). Als dit leeg is, wordt de moskeenaam gebruikt.',
      validation: (rule) => rule.max(70),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO Beschrijving',
      type: 'text',
      rows: 2,
      description: 'Optioneel: overschrijf de meta-beschrijving voor Google (max. 160 tekens).',
      validation: (rule) => rule.max(160),
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Home Pagina' };
    },
  },
});
