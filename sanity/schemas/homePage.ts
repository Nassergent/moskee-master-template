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
    // ── Doneer Kaart (homepage) ──
    defineField({
      name: 'doneerEmoji',
      title: 'Doneer Kaart — Emoji',
      type: 'string',
      initialValue: '🤲',
      description: 'Emoji bovenaan de doneerkaart (bijv. 🤲, 💚, 🕌)',
    }),
    defineField({
      name: 'doneerTitel',
      title: 'Doneer Kaart — Titel',
      type: 'string',
      initialValue: 'Steun onze moskee',
      description: 'Titel van de doneerkaart op de homepage',
    }),
    defineField({
      name: 'doneerBeschrijving',
      title: 'Doneer Kaart — Beschrijving',
      type: 'text',
      rows: 2,
      description: 'Korte tekst onder de titel (bijv. "Uw bijdrage houdt de deuren open voor iedereen")',
    }),

    // ── Document Download (homepage) ──
    defineField({
      name: 'downloadEmoji',
      title: 'Download Kaart — Emoji',
      type: 'string',
      initialValue: '📄',
      description: 'Emoji bovenaan de downloadkaart (bijv. 📄, 📅, 🌙)',
    }),
    defineField({
      name: 'downloadTitel',
      title: 'Download Kaart — Titel',
      type: 'string',
      description: 'Titel van het document (bijv. "Ramadan Programma 2026", "Gebedskalender")',
    }),
    defineField({
      name: 'downloadBeschrijving',
      title: 'Download Kaart — Beschrijving',
      type: 'text',
      rows: 2,
      description: 'Korte beschrijving (bijv. "Download het volledige programma voor de heilige maand")',
    }),
    defineField({
      name: 'downloadBestand',
      title: 'Download Kaart — Bestand',
      type: 'file',
      options: {
        accept: '.pdf,.jpg,.jpeg,.png,.webp',
      },
      description: 'Upload een PDF, afbeelding of ander document. Als er geen bestand is geüpload, wordt de downloadkaart niet getoond.',
    }),

    // ── SEO ──
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
