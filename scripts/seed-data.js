/**
 * Seed Script — Het Digitale Waqf
 *
 * Vult Sanity met voorbeelddata via createOrReplace (deterministische IDs).
 * Gebruik: npm run seed
 */

import { createClient } from '@sanity/client';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Laad .env handmatig (geen dotenv dependency nodig)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([\w.]+)\s*=\s*(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
} catch { /* .env niet gevonden — gebruik bestaande env vars */ }

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
if (!projectId) throw new Error('Missing PUBLIC_SANITY_PROJECT_ID in .env');

const client = createClient({
  projectId,
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_TOKEN || '',
});

// ── Etiquette (5 items) ──

const etiquetteItems = [
  {
    _id: 'etiquette-kom-op-tijd',
    _type: 'etiquette',
    title: 'Kom op tijd',
    description: 'Probeer minimaal 15 minuten voor de Iqamah aanwezig te zijn.',
    volgorde: 1,
    gepubliceerd: true,
  },
  {
    _id: 'etiquette-telefoon-stil',
    _type: 'etiquette',
    title: 'Telefoon op stil',
    description: 'Zet uw telefoon op stil of vliegtuigmodus tijdens het gebed.',
    volgorde: 2,
    gepubliceerd: true,
  },
  {
    _id: 'etiquette-schoenen-uit',
    _type: 'etiquette',
    title: 'Schoenen uit',
    description: 'Plaats uw schoenen netjes in het rek bij de ingang.',
    volgorde: 3,
    gepubliceerd: true,
  },
  {
    _id: 'etiquette-stilte',
    _type: 'etiquette',
    title: 'Stilte in de gebedsruimte',
    description: 'Respecteer de rust en vermijd luide gesprekken in de gebedsruimte.',
    volgorde: 4,
    gepubliceerd: true,
  },
  {
    _id: 'etiquette-netheid',
    _type: 'etiquette',
    title: 'Netheid',
    description: 'Help mee de moskee schoon te houden. Ruim afval op en houd de wudhu-ruimte droog.',
    volgorde: 5,
    gepubliceerd: true,
  },
];

// ── Services (4 items) — veldnamen: titel, beschrijving, icoon, volgorde ──

const serviceItems = [
  {
    _id: 'service-koranles',
    _type: 'service',
    titel: 'Koranles',
    slug: { _type: 'slug', current: 'koranles' },
    beschrijving: 'Wekelijkse Koranlessen voor kinderen en volwassenen, gegeven door ervaren docenten in een rustige leeromgeving.',
    icoon: 'mihrab',
    volgorde: 1,
  },
  {
    _id: 'service-arabische-taalles',
    _type: 'service',
    titel: 'Arabische Taalles',
    slug: { _type: 'slug', current: 'arabische-taalles' },
    beschrijving: 'Leer Arabisch lezen, schrijven en spreken. Cursussen voor beginners tot gevorderden.',
    icoon: 'rozet',
    volgorde: 2,
  },
  {
    _id: 'service-islamitische-uitvaart',
    _type: 'service',
    titel: 'Islamitische Uitvaart',
    slug: { _type: 'slug', current: 'islamitische-uitvaart' },
    beschrijving: 'Begeleiding en ondersteuning bij een islamitische uitvaart volgens de soennitische tradities.',
    icoon: 'ster-4',
    volgorde: 3,
  },
  {
    _id: 'service-huisbezoek',
    _type: 'service',
    titel: 'Huisbezoek & Ziekenbezoek',
    slug: { _type: 'slug', current: 'huisbezoek' },
    beschrijving: 'Bezoek aan zieken en ouderen van de gemeenschap. Geestelijke ondersteuning en gebed.',
    icoon: 'cirkels',
    volgorde: 4,
  },
];

// ── Quotes (2 citaten) — veldnamen: tekst, bron, categorie, actief ──

const quoteItems = [
  {
    _id: 'quote-quran-2-261',
    _type: 'quote',
    tekst: 'Het voorbeeld van degenen die hun rijkdom besteden op de weg van Allah is als een zaadkorrel die zeven aren voortbrengt, in elke aar honderd korrels.',
    bron: 'Quran 2:261',
    categorie: 'donaties',
    actief: true,
  },
  {
    _id: 'quote-tirmidhi-2616',
    _type: 'quote',
    tekst: 'Sadaqah dooft de zonde uit zoals water het vuur dooft.',
    bron: 'Sunan at-Tirmidhi 2616',
    categorie: 'donaties',
    actief: true,
  },
];

// ── Prayer Times (Native Engine defaults) ──

const prayerTimesDoc = {
  _id: 'prayerTimes',
  _type: 'prayerTimes',
  timezone: 'Europe/Brussels',
  coordinates: { lat: 51.05, lng: 3.73 }, // Gent centrum
  method: 'MuslimWorldLeague',
  madhab: 'shafi',
  highLatitudeRule: 'middleOfTheNight',
  adhanOffsets: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  iqamaConfig: {
    fajr: { enabled: true, type: 'offset', minutes: 15 },
    dhuhr: { enabled: true, type: 'offset', minutes: 15 },
    asr: { enabled: true, type: 'offset', minutes: 15 },
    maghrib: { enabled: true, type: 'offset', minutes: 5 },
    isha: { enabled: true, type: 'offset', minutes: 15 },
  },
  jumuahShifts: [
    { _key: 'jumuah-1', label: 'Wintertijd', time: '13:00', note: 'Khutbah begint stipt' },
    { _key: 'jumuah-2', label: 'Zomertijd', time: '14:00', note: 'Khutbah begint stipt' },
  ],
  jumuahNote: 'Let op: De iqamah-tijden kunnen variëren. Raadpleeg het bord in de moskee.',
  footerNote: 'Gebedstijden worden berekend op basis van uw locatie en methode. Controleer bij twijfel altijd de tijden bij de moskee.',
};

// ── Topic Hub: Ramadan 2026 (1 hoofdartikel + 1 sub-artikel + 1 agenda-item) ──

const topicHubItems = [
  // Hoofdartikel (de "hub")
  {
    _id: 'post-ramadan-2026',
    _type: 'post',
    titel: 'Ramadan 2026 — Programma & Activiteiten',
    slug: { _type: 'slug', current: 'ramadan-2026' },
    datum: '2026-02-20T10:00:00Z',
    samenvatting: 'Alles over onze Ramadan-activiteiten: gezamenlijke iftars, nachtgebeden, Koranlezingen en speciale programma\'s voor de hele gemeenschap.',
    inhoud: [
      {
        _type: 'block',
        _key: 'ram-hub-1',
        style: 'normal',
        children: [
          { _type: 'span', _key: 'rh1a', text: 'Ramadan is de heiligste maand in de islamitische kalender. Onze moskee organiseert een uitgebreid programma met activiteiten voor de hele gemeenschap.', marks: [] },
        ],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'ram-hub-2',
        style: 'h3',
        children: [
          { _type: 'span', _key: 'rh2a', text: 'Wat kunt u verwachten?', marks: [] },
        ],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'ram-hub-3',
        style: 'normal',
        listItem: 'bullet',
        children: [
          { _type: 'span', _key: 'rh3a', text: 'Dagelijkse Taraweeh-gebeden na Isha', marks: ['strong'] },
        ],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'ram-hub-4',
        style: 'normal',
        listItem: 'bullet',
        children: [
          { _type: 'span', _key: 'rh4a', text: 'Wekelijkse gezamenlijke iftar (elke vrijdag)', marks: ['strong'] },
        ],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'ram-hub-5',
        style: 'normal',
        listItem: 'bullet',
        children: [
          { _type: 'span', _key: 'rh5a', text: 'Speciale lezingen over de laatste 10 nachten', marks: ['strong'] },
        ],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'ram-hub-6',
        style: 'normal',
        children: [
          { _type: 'span', _key: 'rh6a', text: 'Volg dit programma voor alle updates en bekijk de agenda voor specifieke data en tijden.', marks: [] },
        ],
        markDefs: [],
      },
    ],
    gepubliceerd: true,
  },
  // Sub-artikel (gekoppeld aan hub)
  {
    _id: 'post-laatste-10-nachten',
    _type: 'post',
    titel: 'De waarde van de laatste 10 nachten',
    slug: { _type: 'slug', current: 'de-waarde-van-de-laatste-10-nachten' },
    datum: '2026-03-10T08:00:00Z',
    samenvatting: 'Een verdieping in de spirituele betekenis van de laatste tien nachten van de Ramadan en hoe u het meeste uit Laylat al-Qadr kunt halen.',
    onderwerpHub: { _type: 'reference', _ref: 'post-ramadan-2026' },
    inhoud: [
      {
        _type: 'block',
        _key: 'l10-1',
        style: 'normal',
        children: [
          { _type: 'span', _key: 'l10-1a', text: 'De laatste tien nachten van de Ramadan zijn de meest gezegende nachten van het jaar. De Profeet (vrede zij met hem) verdubbelde zijn aanbidding in deze periode.', marks: [] },
        ],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'l10-2',
        style: 'h3',
        children: [
          { _type: 'span', _key: 'l10-2a', text: 'Laylat al-Qadr', marks: [] },
        ],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'l10-3',
        style: 'normal',
        children: [
          { _type: 'span', _key: 'l10-3a', text: '"De Nacht van de Bestemming is beter dan duizend maanden" (Quran 97:3). Zoek deze nacht in de ', marks: [] },
          { _type: 'span', _key: 'l10-3b', text: 'oneven nachten', marks: ['strong'] },
          { _type: 'span', _key: 'l10-3c', text: ' van de laatste tien: de 21e, 23e, 25e, 27e en 29e nacht.', marks: [] },
        ],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'l10-4',
        style: 'blockquote',
        children: [
          { _type: 'span', _key: 'l10-4a', text: 'Wie bidt tijdens Laylat al-Qadr met geloof en in de hoop op beloning, diens voorgaande zonden worden vergeven. — Sahih al-Bukhari', marks: [] },
        ],
        markDefs: [],
      },
    ],
    gepubliceerd: true,
  },
  // Agenda-item (gekoppeld aan hub)
  {
    _id: 'agenda-iftar-ramadan',
    _type: 'agendaEvent',
    titel: 'Gezamenlijke Iftar',
    slug: { _type: 'slug', current: 'gezamenlijke-iftar' },
    startDatum: '2026-03-20T18:30:00+01:00',
    eindDatum: '2026-03-20T20:30:00+01:00',
    locatie: 'Grote zaal',
    categorie: 'Iftar',
    onderwerpHub: { _type: 'reference', _ref: 'post-ramadan-2026' },
    beschrijving: [
      {
        _type: 'block',
        _key: 'iftar-1',
        style: 'normal',
        children: [
          { _type: 'span', _key: 'iftar-1a', text: 'Iedere vrijdag tijdens de Ramadan organiseren wij een gezamenlijke iftar in de grote zaal. Iedereen is welkom — breng gerust familie en vrienden mee!', marks: [] },
        ],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'iftar-2',
        style: 'normal',
        children: [
          { _type: 'span', _key: 'iftar-2a', text: 'Na de iftar bidden we samen het Maghrib-gebed, gevolgd door de Taraweeh.', marks: [] },
        ],
        markDefs: [],
      },
    ],
    gepubliceerd: true,
  },
];

// ── Lesson Programs (2 items) ──

const lessonProgramItems = [
  {
    _id: 'lesson-koranles',
    _type: 'lessonProgram',
    titel: 'Koranles',
    slug: { _type: 'slug', current: 'koranles' },
    categorie: 'kinderen',
    beschrijving: 'Wekelijkse Koranlessen voor kinderen. Leer Koran lezen met correcte tajweed onder begeleiding van ervaren docenten.',
    inhoud: [
      {
        _type: 'block',
        _key: 'koran-blk1',
        style: 'normal',
        children: [
          { _type: 'span', _key: 'k1a', text: 'Onze Koranlessen worden gegeven door ervaren docenten met jarenlange ervaring in het onderwijzen van tajweed aan kinderen. De lessen zijn opgebouwd van beginnersniveau tot gevorderd.', marks: [] },
        ],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'koran-blk2',
        style: 'h3',
        children: [
          { _type: 'span', _key: 'k2a', text: 'Wat leren de kinderen?', marks: [] },
        ],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'koran-blk3',
        style: 'normal',
        listItem: 'bullet',
        children: [
          { _type: 'span', _key: 'k3a', text: 'Correcte uitspraak van Arabische letters', marks: [] },
        ],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'koran-blk4',
        style: 'normal',
        listItem: 'bullet',
        children: [
          { _type: 'span', _key: 'k4a', text: 'Tajweed regels stap voor stap', marks: [] },
        ],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'koran-blk5',
        style: 'normal',
        listItem: 'bullet',
        children: [
          { _type: 'span', _key: 'k5a', text: 'Memorisatie van korte soerah\'s', marks: [] },
        ],
        markDefs: [],
      },
    ],
    maxCapaciteit: 25,
    inschrijvingOpen: true,
    rooster: [
      { _key: 'koran-za', dag: 'zaterdag', startTijd: '10:00', eindTijd: '12:00', actief: true },
      { _key: 'koran-zo', dag: 'zondag', startTijd: '10:00', eindTijd: '12:00', actief: true },
    ],
    volgorde: 1,
    actief: true,
  },
  {
    _id: 'lesson-arabisch',
    _type: 'lessonProgram',
    titel: 'Arabische Taal',
    slug: { _type: 'slug', current: 'arabische-taal' },
    categorie: 'vrouwen',
    beschrijving: 'Arabisch leren lezen, schrijven en spreken. Geschikt voor vrouwen die de taal van de Koran willen begrijpen.',
    inhoud: [
      {
        _type: 'block',
        _key: 'arab-blk1',
        style: 'normal',
        children: [
          { _type: 'span', _key: 'a1a', text: 'Deze cursus richt zich op het aanleren van de Arabische taal, met aandacht voor zowel ', marks: [] },
          { _type: 'span', _key: 'a1b', text: 'lezen, schrijven als spreken', marks: ['strong'] },
          { _type: 'span', _key: 'a1c', text: '. De lessen worden gegeven in een rustige omgeving, exclusief voor vrouwen.', marks: [] },
        ],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'arab-blk2',
        style: 'h3',
        children: [
          { _type: 'span', _key: 'a2a', text: 'Programma', marks: [] },
        ],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'arab-blk3',
        style: 'normal',
        children: [
          { _type: 'span', _key: 'a3a', text: 'Het programma loopt van september tot juni en is geschikt voor beginners. Er wordt gewerkt met professioneel lesmateriaal.', marks: [] },
        ],
        markDefs: [],
      },
    ],
    inschrijvingOpen: true,
    rooster: [
      { _key: 'arab-wo', dag: 'woensdag', startTijd: '19:00', eindTijd: '20:30', actief: true },
    ],
    volgorde: 2,
    actief: true,
  },
];

// ── Ramadan Override (singleton) ──

const ramadanOverrideDoc = {
  _id: 'ramadanOverride',
  _type: 'ramadanOverride',
  ingeschakeld: false,
  omschrijving: 'Tijdens de Ramadan gelden aangepaste lestijden. Raadpleeg onderstaand rooster.',
  rooster: [
    { _key: 'ram-1', datum: '2026-03-15', startTijd: '10:00', eindTijd: '11:30', notitie: 'Koranles (verkort)' },
    { _key: 'ram-2', datum: '2026-03-16', startTijd: '10:00', eindTijd: '11:30', notitie: 'Koranles (verkort)' },
    { _key: 'ram-3', datum: '2026-03-18', startTijd: '19:30', eindTijd: '20:30', notitie: 'Arabisch (na iftar)' },
  ],
};

// ── Janazah Procedure (singleton) ──

const janazahProcedureDoc = {
  _id: 'janazahProcedure',
  _type: 'janazahProcedure',
  titel: 'Hulp bij Overlijden',
  noodnummer: '+32 470 00 00 00',
  introductie: [
    {
      _type: 'block',
      _key: 'intro-1',
      style: 'normal',
      children: [
        { _type: 'span', _key: 'i1a', text: 'Bij het overlijden van een dierbare staat de moskee klaar om u te begeleiden. ', marks: [] },
        { _type: 'span', _key: 'i1b', text: 'Neem zo snel mogelijk contact met ons op via het noodnummer.', marks: ['strong'] },
      ],
      markDefs: [],
    },
  ],
  stappen: [
    {
      _key: 'stap-1',
      _type: 'stapItem',
      icoon: 'water',
      titelNL: 'Rituele wassing (Ghusl)',
      titelAR: 'الغسل',
      tekst: [
        {
          _type: 'block', _key: 's1b1', style: 'normal',
          children: [{ _type: 'span', _key: 's1a', text: 'De overledene wordt gewassen volgens de islamitische traditie. De moskee beschikt over een waskamer en begeleidt de familie hierbij.', marks: [] }],
          markDefs: [],
        },
      ],
    },
    {
      _key: 'stap-2',
      _type: 'stapItem',
      icoon: 'gebed',
      titelNL: 'Janazah-gebed (Salat al-Janazah)',
      titelAR: 'صلاة الجنازة',
      tekst: [
        {
          _type: 'block', _key: 's2b1', style: 'normal',
          children: [{ _type: 'span', _key: 's2a', text: 'Het gemeenschapsgebed voor de overledene wordt verricht in de moskee. De imam leidt het gebed en de gemeente wordt uitgenodigd om deel te nemen.', marks: [] }],
          markDefs: [],
        },
      ],
    },
    {
      _key: 'stap-3',
      _type: 'stapItem',
      icoon: 'begrafenis',
      titelNL: 'Begrafenis (Dafn)',
      titelAR: 'الدفن',
      tekst: [
        {
          _type: 'block', _key: 's3b1', style: 'normal',
          children: [{ _type: 'span', _key: 's3a', text: 'De begrafenis vindt plaats op een islamitische begraafplaats. De moskee helpt bij de coördinatie met de gemeente en het uitvaartcentrum.', marks: [] }],
          markDefs: [],
        },
      ],
    },
  ],
};

// ── Janazah Alert (voorbeeld, uitgeschakeld) ──

const janazahAlertDoc = {
  _id: 'janazah-voorbeeld',
  _type: 'janazahAlert',
  naamOverledene: 'Voorbeeld Naam',
  naGebed: 'Dhuhr-gebed',
  gebedstijdstip: '14:00',
  gebeddatum: '2026-01-01',
  duaArabisch: 'اللَّهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ',
  familyConsent: false,
  actief: false,
};

// ── Settings singleton (onboarding-critical) ──

const settingsDoc = {
  _id: 'settings',
  _type: 'settings',
  mosqueName: 'Nieuwe Moskee',
  description: 'Welkom bij uw moskee — een plek van gebed, kennis en gemeenschap.',
  primaryTheme: 'deep-bordeaux',
  timezone: 'Europe/Brussels',
  hijriAdjustment: 0,
  menuToggles: {
    showServices: true,
    showLessen: true,
    showProjects: true,
    showAbout: true,
    showMollie: true,
  },
  islamicDays: {
    enabled: true,
    showRamadan: true,
    showEidFitr: true,
    showEidAdha: true,
    showArafah: true,
    showLailatAlQadr: true,
    showAshura: true,
    showIsraMiraj: true,
  },
};

// ── Contact Page singleton (onboarding-critical) ──

const contactPageDoc = {
  _id: 'contactPage',
  _type: 'contactPage',
  introText: 'Neem gerust contact met ons op.',
};

// ── Seed alles ──

async function seed() {
  const allDocs = [settingsDoc, contactPageDoc, prayerTimesDoc, ...etiquetteItems, ...serviceItems, ...quoteItems, ...topicHubItems, ...lessonProgramItems, ramadanOverrideDoc, janazahProcedureDoc, janazahAlertDoc];

  console.log(`Seeding ${allDocs.length} documenten naar Sanity...`);

  for (const doc of allDocs) {
    try {
      await client.createOrReplace(doc);
      console.log(`  ✓ ${doc._type}: ${doc.title || doc.titel || doc.tekst?.substring(0, 40)}`);
    } catch (err) {
      console.error(`  ✗ ${doc._type} (${doc._id}):`, err.message);
    }
  }

  console.log('\nSeed voltooid!');
}

seed().catch((err) => {
  console.error('Seed script mislukt:', err);
  process.exit(1);
});
