import { defineType, defineField } from 'sanity';

export const settings = defineType({
  name: 'settings',
  title: 'Site Instellingen',
  type: 'document',
  groups: [
    { name: 'general', title: 'Algemeen', default: true },
    { name: 'navigation', title: 'Navigatie' },
    { name: 'kalender', title: 'Kalender Beheer' },
    { name: 'contact', title: 'Contact & Socials' },
    { name: 'legal', title: 'Juridisch & Financieel' },
  ],
  fields: [
    // === ALGEMEEN ===
    defineField({
      name: 'mosqueName',
      title: 'Moskee Naam',
      type: 'string',
      group: 'general',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Korte Beschrijving (footer & SEO)',
      type: 'text',
      rows: 3,
      group: 'general',
      description: 'Wordt getoond in de footer, Google-zoekresultaten en als fallback op de homepage als daar geen aparte tekst is ingevuld.',
    }),
    defineField({
      name: 'logo',
      title: 'Logo (Navigatie)',
      type: 'image',
      group: 'general',
      description: 'Het logo bovenaan in de navigatiebalk. Alt-tekst = moskeenaam.',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'logoFooter',
      title: 'Logo (Footer)',
      type: 'image',
      group: 'general',
      description: 'Optioneel apart logo voor de footer. Als dit leeg is, wordt het navigatie-logo gebruikt.',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'favicon',
      title: 'Favicon',
      type: 'image',
      group: 'general',
      description: 'Het kleine icoontje in het browsertabblad. Gebruik bij voorkeur een vierkante afbeelding (bijv. 64×64 of 128×128 pixels).',
    }),
    // heroImage → verplaatst naar homePage singleton
    // overOnsAfbeelding → verplaatst naar aboutPage singleton
    defineField({
      name: 'theme',
      title: 'Huisstijl Kleuren (60-30-10 Regel)',
      type: 'object',
      group: 'general',
      description: 'Pas de kleuren van uw website aan. Kies 3 kleuren die uw moskee vertegenwoordigen.',
      fields: [
        defineField({
          name: 'baseColor',
          title: 'Basis Kleur (60%) — Achtergronden',
          type: 'string',
          initialValue: '#FBF9F7',
          description: 'De rustige achtergrondkleur. Gebruik een lichte, zachte kleur (bijv. gebroken wit, licht zand).',
        }),
        defineField({
          name: 'primaryColor',
          title: 'Hoofdkleur (30%) — Navigatie & Titels',
          type: 'string',
          initialValue: '#1D5C6B',
          description: 'De identiteitskleur van uw moskee. Voor navigatiebalk, titels en headers.',
        }),
        defineField({
          name: 'accentColor',
          title: 'Accentkleur (10%) — Doneerknop & Details',
          type: 'string',
          initialValue: '#593B1D',
          description: 'De opvallende kleur voor actie-knoppen (Doneer), iconen en highlights.',
        }),
      ],
    }),

    // === NAVIGATIE ===
    defineField({
      name: 'menuToggles',
      title: 'Menubalk Instellingen',
      type: 'object',
      group: 'navigation',
      fields: [
        defineField({
          name: 'showServices',
          title: 'Toon Diensten',
          type: 'boolean',
          initialValue: true,
        }),
        defineField({
          name: 'showProjects',
          title: 'Toon Projecten',
          type: 'boolean',
          initialValue: true,
        }),
        defineField({
          name: 'showNews',
          title: 'Toon Nieuws (Artikelen)',
          type: 'boolean',
          initialValue: true,
        }),
        defineField({
          name: 'showAbout',
          title: 'Toon Over Ons',
          type: 'boolean',
          initialValue: true,
        }),
        defineField({
          name: 'showAgenda',
          title: 'Toon Agenda',
          type: 'boolean',
          initialValue: true,
        }),
      ],
    }),
    defineField({
      name: 'donateButtonText',
      title: 'Tekst op Doneer-knop',
      type: 'string',
      group: 'navigation',
      initialValue: 'Doneer',
    }),

    // === KALENDER BEHEER ===
    defineField({
      name: 'hijriAdjustment',
      title: 'Hijri Datum Correctie',
      type: 'number',
      group: 'kalender',
      description: 'Pas de hijri-datum aan als deze niet overeenkomt met uw lokale maansichting. 0 = standaard berekening.',
      initialValue: 0,
      options: {
        list: [
          { title: '-2 dagen', value: -2 },
          { title: '-1 dag', value: -1 },
          { title: 'Standaard (0)', value: 0 },
          { title: '+1 dag', value: 1 },
          { title: '+2 dagen', value: 2 },
        ],
      },
    }),
    defineField({
      name: 'islamicDays',
      title: 'Islamitische Dagen (AnnouncementBar)',
      type: 'object',
      group: 'kalender',
      description: 'Selecteer welke islamitische dagen een melding tonen bovenaan de website (max. 30 dagen vooraf).',
      fields: [
        defineField({
          name: 'enabled',
          title: 'AnnouncementBar inschakelen',
          type: 'boolean',
          initialValue: true,
        }),
        defineField({
          name: 'showRamadan',
          title: 'Ramadan (begin vastenmaand)',
          type: 'boolean',
          initialValue: true,
        }),
        defineField({
          name: 'showEidFitr',
          title: 'Eid al-Fitr (Suikerfeest)',
          type: 'boolean',
          initialValue: true,
        }),
        defineField({
          name: 'showEidAdha',
          title: 'Eid al-Adha (Offerfeest)',
          type: 'boolean',
          initialValue: true,
        }),
        defineField({
          name: 'showArafah',
          title: 'Dag van Arafah',
          type: 'boolean',
          initialValue: true,
        }),
        defineField({
          name: 'showLailatAlQadr',
          title: 'Laylat al-Qadr (27e Ramadan)',
          type: 'boolean',
          initialValue: true,
        }),
        defineField({
          name: 'showAshura',
          title: 'Ashura (10e Muharram)',
          type: 'boolean',
          initialValue: true,
        }),
        defineField({
          name: 'showIsraMiraj',
          title: "Isra' & Mi'raj (27e Rajab)",
          type: 'boolean',
          initialValue: true,
        }),
      ],
    }),

    // === CONTACT & SOCIALS ===
    defineField({
      name: 'address',
      title: 'Adres',
      type: 'string',
      group: 'contact',
      description: 'Volledig adres zoals weergegeven in de footer en contactpagina',
    }),
    defineField({
      name: 'phone',
      title: 'Telefoonnummer',
      type: 'string',
      group: 'contact',
    }),
    defineField({
      name: 'email',
      title: 'E-mailadres',
      type: 'string',
      group: 'contact',
    }),
    defineField({
      name: 'whatsapp',
      title: 'WhatsApp Nummer',
      type: 'string',
      group: 'contact',
      description: 'Internationaal formaat, bijv. 32487123456',
    }),
    defineField({
      name: 'socials',
      title: 'Social Media Links',
      type: 'object',
      group: 'contact',
      fields: [
        defineField({ name: 'facebook', title: 'Facebook URL', type: 'url' }),
        defineField({ name: 'instagram', title: 'Instagram URL', type: 'url' }),
        defineField({ name: 'youtube', title: 'YouTube URL', type: 'url' }),
      ],
    }),

    // === JURIDISCH & FINANCIEEL ===
    defineField({
      name: 'iban',
      title: 'IBAN Nummer',
      type: 'string',
      group: 'legal',
      description: 'Wordt getoond in de footer voor transparantie',
    }),
    defineField({
      name: 'legal',
      title: 'Juridische Informatie',
      type: 'object',
      group: 'legal',
      fields: [
        defineField({
          name: 'kvk',
          title: 'KVK of VZW Nummer',
          type: 'string',
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'mosqueName' },
    prepare({ title }) {
      return { title: title || 'Site Instellingen' };
    },
  },
});
