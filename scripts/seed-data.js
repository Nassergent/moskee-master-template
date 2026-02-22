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
    icon: 'ster-8',
    volgorde: 1,
    isPublished: true,
  },
  {
    _id: 'etiquette-telefoon-stil',
    _type: 'etiquette',
    title: 'Telefoon op stil',
    description: 'Zet uw telefoon op stil of vliegtuigmodus tijdens het gebed.',
    icon: 'maan',
    volgorde: 2,
    isPublished: true,
  },
  {
    _id: 'etiquette-schoenen-uit',
    _type: 'etiquette',
    title: 'Schoenen uit',
    description: 'Plaats uw schoenen netjes in het rek bij de ingang.',
    icon: 'ruit',
    volgorde: 3,
    isPublished: true,
  },
  {
    _id: 'etiquette-stilte',
    _type: 'etiquette',
    title: 'Stilte in de gebedsruimte',
    description: 'Respecteer de rust en vermijd luide gesprekken in de gebedsruimte.',
    icon: 'rozet',
    volgorde: 4,
    isPublished: true,
  },
  {
    _id: 'etiquette-netheid',
    _type: 'etiquette',
    title: 'Netheid',
    description: 'Help mee de moskee schoon te houden. Ruim afval op en houd de wudhu-ruimte droog.',
    icon: 'hexagon',
    volgorde: 5,
    isPublished: true,
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

// ── Seed alles ──

async function seed() {
  const allDocs = [...etiquetteItems, ...serviceItems, ...quoteItems];

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
