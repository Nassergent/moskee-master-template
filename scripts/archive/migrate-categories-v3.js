/**
 * Migratie v3 — Definitieve categorie-architectuur
 *
 * Finale set (6 categorieën):
 *   1. Gebed        — Jumu'ah, Qiyam, extra jama'ah
 *   2. Onderwijs    — Koranles, Arabisch, tafsir, fiqh, workshops
 *   3. Gemeenschap  — Iftar (buiten Ramadan), buurtmomenten, open dag, familiedag
 *   4. Vrijwilligers — Schoonmaak, keuken, logistiek, inzamelacties
 *   5. Ramadan      — Tarawih, iftar-planning, Qiyam, Ramadan-lezingen
 *   6. Eid          — Eid-gebed, Eid-viering, praktische info
 *
 * Wijzigingen t.o.v. v2:
 *   - Evenement → Gemeenschap (hernoemd, breder)
 *   - Iftar → verwijderd (opgegaan in Ramadan/Gemeenschap)
 *   - Overig → verwijderd (herclassificeren)
 *   - Ramadan → nieuw
 *
 * Gebruik: node scripts/migrate-categories-v3.js
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

// ── Stap 1: Definitieve 6 categorieën (createOrReplace) ──

console.log('── Stap 1: Definitieve 6 categorieën ──\n');

const finalCategories = [
  { _id: 'eventcat-gebed',        titel: 'Gebed',        slug: 'gebed',        kleur: '#5B2334', icoon: '🕌', volgorde: 1 },
  { _id: 'eventcat-les',          titel: 'Onderwijs',    slug: 'onderwijs',    kleur: '#1D5C6B', icoon: '📚', volgorde: 2 },
  { _id: 'eventcat-bijeenkomst',  titel: 'Gemeenschap',  slug: 'gemeenschap',  kleur: '#374151', icoon: '🤝', volgorde: 3 },
  { _id: 'eventcat-vrijwilligers',titel: 'Vrijwilligers', slug: 'vrijwilligers', kleur: '#25D366', icoon: '💪', volgorde: 4 },
  { _id: 'eventcat-ramadan',      titel: 'Ramadan',      slug: 'ramadan',      kleur: '#C9A983', icoon: '🌙', volgorde: 5 },
  { _id: 'eventcat-eid',          titel: 'Eid',          slug: 'eid',          kleur: '#8B6843', icoon: '🎉', volgorde: 6 },
];

for (const cat of finalCategories) {
  await client.createOrReplace({
    _id: cat._id,
    _type: 'eventCategorie',
    titel: cat.titel,
    slug: { _type: 'slug', current: cat.slug },
    kleur: cat.kleur,
    icoon: cat.icoon,
    volgorde: cat.volgorde,
  });
  console.log(`  ✓ ${cat.volgorde}. ${cat.titel} (${cat._id})`);
}

// ── Stap 2: Herlink events die naar Iftar verwezen ──

console.log('\n── Stap 2: Herlink Iftar-events → Ramadan of Gemeenschap ──\n');

const iftarEvents = await client.fetch(
  `*[_type == "agendaEvent" && categorieRef._ref == "eventcat-iftar"]{ _id, titel }`
);

if (iftarEvents.length > 0) {
  // Iftar events → Ramadan (de meeste iftar-events zijn Ramadan-gerelateerd)
  for (const event of iftarEvents) {
    await client.patch(event._id).set({
      categorieRef: { _type: 'reference', _ref: 'eventcat-ramadan' },
    }).commit();
    console.log(`  ✓ ${event._id} (${event.titel}) → Ramadan`);
  }
} else {
  console.log('  ⏭ Geen events met Iftar-categorie');
}

// ── Stap 3: Herlink events die naar Overig verwezen ──

console.log('\n── Stap 3: Herlink Overig-events → Gemeenschap ──\n');

const overigEvents = await client.fetch(
  `*[_type == "agendaEvent" && categorieRef._ref == "eventcat-overig"]{ _id, titel }`
);

if (overigEvents.length > 0) {
  for (const event of overigEvents) {
    await client.patch(event._id).set({
      categorieRef: { _type: 'reference', _ref: 'eventcat-bijeenkomst' },
    }).commit();
    console.log(`  ✓ ${event._id} (${event.titel}) → Gemeenschap`);
  }
} else {
  console.log('  ⏭ Geen events met Overig-categorie');
}

// ── Stap 4: Verwijder Iftar en Overig categorieën ──

console.log('\n── Stap 4: Verwijder Iftar en Overig categorieën ──\n');

for (const id of ['eventcat-iftar', 'eventcat-overig']) {
  try {
    await client.delete(id);
    console.log(`  ✓ ${id} verwijderd`);
  } catch (e) {
    console.log(`  ⏭ ${id} bestond niet of al verwijderd`);
  }
}

// ── Stap 5: Verificatie ──

console.log('\n── Stap 5: Verificatie ──\n');

const nietGekoppeld = await client.fetch(
  `*[_type == "agendaEvent" && !defined(categorieRef)]{ _id, titel, categorie }`
);

if (nietGekoppeld.length === 0) {
  console.log('  ✅ Alle events hebben een categorieRef');
} else {
  console.log(`  ⚠ ${nietGekoppeld.length} events zonder categorieRef:`);
  for (const e of nietGekoppeld) {
    console.log(`    - ${e._id}: "${e.titel}" (oud: ${e.categorie || 'n/a'})`);
  }
}

const cats = await client.fetch(
  `*[_type == "eventCategorie"] | order(volgorde asc) { _id, titel, kleur, icoon, volgorde }`
);
console.log('\n  Finale categorieën:');
for (const c of cats) {
  console.log(`    ${c.icoon} ${c.volgorde}. ${c.titel} (${c.kleur})`);
}

const eventCount = await client.fetch(`count(*[_type == "agendaEvent"])`);
const refCount = await client.fetch(`count(*[_type == "agendaEvent" && defined(categorieRef)])`);
console.log(`\n  Events: ${refCount}/${eventCount} met categorieRef`);

console.log('\n✅ Migratie v3 voltooid — definitieve architectuur!');
