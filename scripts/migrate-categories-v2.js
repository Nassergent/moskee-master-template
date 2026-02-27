/**
 * Migratie v2 — Architecturaal correcte categorie-update
 *
 * 1. Hernoem "Les" → "Onderwijs"
 * 2. Hernoem "Bijeenkomst" → "Evenement"
 * 3. Koppel de 5 overgeslagen events via juiste categorie + doelgroep
 *
 * Gebruik: node scripts/migrate-categories-v2.js
 */

import { createClient } from '@sanity/client';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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

// ── Stap 1: Hernoem categorieën ──

console.log('── Stap 1: Hernoem categorieën ──\n');

// Les → Onderwijs
await client.createOrReplace({
  _id: 'eventcat-les',
  _type: 'eventCategorie',
  titel: 'Onderwijs',
  slug: { _type: 'slug', current: 'onderwijs' },
  kleur: '#1D5C6B',
  icoon: '📚',
  volgorde: 2,
});
console.log('  ✓ "Les" → "Onderwijs" (eventcat-les)');

// Bijeenkomst → Evenement
await client.createOrReplace({
  _id: 'eventcat-bijeenkomst',
  _type: 'eventCategorie',
  titel: 'Evenement',
  slug: { _type: 'slug', current: 'evenement' },
  kleur: '#374151',
  icoon: '🤝',
  volgorde: 5,
});
console.log('  ✓ "Bijeenkomst" → "Evenement" (eventcat-bijeenkomst)');

// ── Stap 2: Koppel overgeslagen events ──

console.log('\n── Stap 2: Koppel overgeslagen events ──\n');

// Mapping: eventId → { categorieRef, doelgroep }
// Jeugd → doelgroep, niet categorie
// Onderwijs → categorie "Onderwijs" (was "Les")
// Gemeenschap → categorie "Evenement" (was "Bijeenkomst")
const fixes = [
  {
    filter: '_id in ["event-jongerenavond", "drafts.event-jongerenavond"]',
    label: 'Jongerenavond',
    categorieRef: 'eventcat-bijeenkomst', // Evenement
    doelgroep: 'Jeugd',
  },
  {
    filter: '_id in ["event-tafsir-dames", "drafts.event-tafsir-dames"]',
    label: 'Tafsir Dames',
    categorieRef: 'eventcat-les', // Onderwijs
    doelgroep: 'Vrouwen',
  },
  {
    filter: '_id in ["event-schoonmaakdag", "drafts.event-schoonmaakdag"]',
    label: 'Schoonmaakdag',
    categorieRef: 'eventcat-bijeenkomst', // Evenement (vrijwilligerswerk = evenement)
    doelgroep: 'Iedereen',
  },
];

for (const fix of fixes) {
  const docs = await client.fetch(`*[_type == "agendaEvent" && ${fix.filter}]{ _id }`);

  for (const doc of docs) {
    await client.patch(doc._id).set({
      categorieRef: { _type: 'reference', _ref: fix.categorieRef },
      doelgroep: fix.doelgroep,
    }).commit();
    console.log(`  ✓ ${doc._id} → ${fix.label} (cat: ${fix.categorieRef}, doelgroep: ${fix.doelgroep})`);
  }

  if (docs.length === 0) {
    console.log(`  ⏭ ${fix.label}: geen docs gevonden (mogelijk al verwijderd)`);
  }
}

// ── Stap 3: Verificatie ──

console.log('\n── Stap 3: Verificatie ──\n');

const nietGekoppeld = await client.fetch(
  `*[_type == "agendaEvent" && defined(categorie) && !defined(categorieRef)]{ _id, categorie }`
);

if (nietGekoppeld.length === 0) {
  console.log('  ✅ Alle events hebben een categorieRef!');
} else {
  console.log(`  ⚠ Nog ${nietGekoppeld.length} events zonder categorieRef:`);
  for (const e of nietGekoppeld) {
    console.log(`    - ${e._id}: "${e.categorie}"`);
  }
}

const cats = await client.fetch(
  `*[_type == "eventCategorie"] | order(volgorde asc) { titel, kleur, volgorde }`
);
console.log('\n  Huidige categorieën:');
for (const c of cats) {
  console.log(`    ${c.volgorde}. ${c.titel} (${c.kleur})`);
}

console.log('\n✅ Migratie v2 voltooid!');
