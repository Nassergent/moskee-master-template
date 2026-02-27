import { defineType, defineField } from 'sanity';

export const homePage = defineType({
  name: 'homePage',
  title: 'Home Pagina',
  type: 'document',
  fields: [
    defineField({
      name: 'heroTagline',
      title: 'Tagline boven titel',
      type: 'string',
      description: 'Optioneel: klein tekstje boven de H1 titel (bijv. "Welkom", "Ramadan Mubarak"). Laat leeg om te verbergen.',
      validation: (rule) => rule.max(50),
    }),
    defineField({
      name: 'heroTitle',
      title: 'Hero Titel (H1)',
      type: 'string',
      description: 'De grote hoofdtitel in de hero sectie (bijv. "Moskee El Fath"). Dit is de H1 — belangrijk voor SEO.',
      validation: (rule) => rule.max(100),
    }),
    defineField({
      name: 'heroSubtitle',
      title: 'Hero Ondertitel',
      type: 'text',
      rows: 3,
      description: 'De beschrijvende tekst onder de titel. Als dit leeg is, wordt de "Korte Beschrijving" uit Site Instellingen gebruikt.',
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
  ],
  preview: {
    prepare() {
      return { title: 'Home Pagina' };
    },
  },
});
