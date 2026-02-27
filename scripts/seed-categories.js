/**
 * Seed Categories + Migratie Script — Het Digitale Waqf
 *
 * Stap A: Seed 7 eventCategorie documenten (idempotent via createOrReplace).
 * Stap B: Koppel bestaande agendaEvent docs aan de nieuwe categorieRef.
 *
 * Gebruik: npm run seed:categories
 */

import { createClient } from '@sanity/client';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Laad .env handmatig
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
} catch { /* .env niet gevonden */ }

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
if (!projectId) throw new Error('Missing PUBLIC_SANITY_PROJECT_ID in .env');

const client = createClient({
  projectId,
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_TOKEN || '',
});

// ── Stap A: Seed categorieën ──

const categories = [
  { _id: 'eventcat-gebed',         titel: 'Gebed',        slug: 'gebed',        kleur: '#5B2334', icoon: '🕌', volgorde: 1 },
  { _id: 'eventcat-les',           titel: 'Onderwijs',    slug: 'onderwijs',    kleur: '#1D5C6B', icoon: '📚', volgorde: 2 },
  { _id: 'eventcat-bijeenkomst',   titel: 'Gemeenschap',  slug: 'gemeenschap',  kleur: '#374151', icoon: '🤝', volgorde: 3 },
  { _id: 'eventcat-vrijwilligers', titel: 'Vrijwilligers', slug: 'vrijwilligers', kleur: '#25D366', icoon: '💪', volgorde: 4 },
  { _id: 'eventcat-ramadan',       titel: 'Ramadan',      slug: 'ramadan',      kleur: '#C9A983', icoon: '🌙', volgorde: 5 },
  { _id: 'eventcat-eid',           titel: 'Eid',          slug: 'eid',          kleur: '#8B6843', icoon: '🎉', volgorde: 6 },
];

console.log('── Stap A: Seed categorieën ──');

for (const cat of categories) {
  await client.createOrReplace({
    _id: cat._id,
    _type: 'eventCategorie',
    titel: cat.titel,
    slug: { _type: 'slug', current: cat.slug },
    kleur: cat.kleur,
    icoon: cat.icoon,
    volgorde: cat.volgorde,
  });
  console.log(`  ✓ ${cat.titel} (${cat._id})`);
}

console.log(`\n${categories.length} categorieën geseeded.\n`);

// ── Stap B: Koppel bestaande events ──

console.log('── Stap B: Koppel bestaande events ──');

const events = await client.fetch(
  `*[_type == "agendaEvent" && defined(categorie) && !defined(categorieRef)]{ _id, categorie }`
);

if (events.length === 0) {
  console.log('  Geen events om te koppelen (al gemigreerd of geen events).\n');
} else {
  // Mapping van lowercase categorie naam → eventcat ID
  // Inclusief aliassen voor oude waarden
  const catMap = {};
  for (const cat of categories) {
    catMap[cat.titel.toLowerCase().trim()] = cat._id;
  }
  // Aliassen: oude namen → nieuwe categorieën
  catMap['les'] = 'eventcat-les';           // Les → Onderwijs
  catMap['bijeenkomst'] = 'eventcat-bijeenkomst'; // Bijeenkomst → Gemeenschap
  catMap['iftar'] = 'eventcat-ramadan';     // Iftar → Ramadan
  catMap['overig'] = 'eventcat-bijeenkomst'; // Overig → Gemeenschap

  let gekoppeld = 0;
  let overgeslagen = 0;

  for (const event of events) {
    const key = (event.categorie || '').toLowerCase().trim();
    const catId = catMap[key];

    if (catId) {
      await client.patch(event._id).set({
        categorieRef: { _type: 'reference', _ref: catId },
      }).commit();
      console.log(`  ✓ ${event._id} → ${catId}`);
      gekoppeld++;
    } else {
      console.log(`  ⚠ ${event._id}: categorie "${event.categorie}" niet gevonden, overgeslagen`);
      overgeslagen++;
    }
  }

  console.log(`\n${gekoppeld} events gekoppeld, ${overgeslagen} overgeslagen.\n`);
}

console.log('✅ Categorie migratie voltooid!');
