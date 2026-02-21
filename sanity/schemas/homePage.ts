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
    }),
    defineField({
      name: 'toonActueel',
      title: 'Toon "Actueel" sectie',
      type: 'boolean',
      initialValue: true,
      description: 'Schakel de actueel sectie op de homepage in/uit',
    }),
    defineField({
      name: 'badges',
      title: 'Welkom Badges',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Welkomstwoorden in verschillende talen (bijv. "Allen Welkom", "All Welcome")',
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Home Pagina' };
    },
  },
});
