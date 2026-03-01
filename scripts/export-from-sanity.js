/**
 * Export Seed Data — Het Digitale Waqf
 *
 * Exporteert ALLE content uit de huidige Sanity dataset naar seed-export.json.
 * Draai dit op de MOEDER om de seed te refreshen na content-wijzigingen.
 *
 * Gebruik: npm run seed:export
 *
 * LET OP: Dit overschrijft seed-export.json met de huidige live data.
 * Settings worden NIET gegeneraliseerd — pas handmatig aan indien nodig.
 */

import { createClient } from '@sanity/client';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from './lib/load-env.js';

// ── .env laden ──
loadEnv(import.meta.url);

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
if (!projectId) throw new Error('Missing PUBLIC_SANITY_PROJECT_ID in .env');

const client = createClient({
  projectId,
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_TOKEN || '',
});

// ── Niet-seedbare types ──
const SKIP_TYPES = [
  'sanity.imageAsset',
  'sanity.fileAsset',
  'system.group',
  'system.retention',
  'eventRegistration',
  'volunteer',
];

// ── Export ──
console.log(`Exporteren uit ${projectId}/${process.env.PUBLIC_SANITY_DATASET || 'production'}...`);

const query = `*[!(_type in $skipTypes) && !(_id match "drafts.**") && !(_id match "_.**")] | order(_type asc)`;
const docs = await client.fetch(query, { skipTypes: SKIP_TYPES });

// Clean interne Sanity velden
function clean(doc) {
  const cleaned = {};
  for (const [key, value] of Object.entries(doc)) {
    if (['_createdAt', '_updatedAt', '_rev', '_system'].includes(key)) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

const cleaned = docs.map(clean);

// Sorteer: singletons eerst
const singletonIds = new Set([
  'settings', 'contactPage', 'prayerTimes', 'homePage',
  'homeCards', 'aboutPage', 'ramadanOverride', 'janazahProcedure',
]);
cleaned.sort((a, b) => {
  const aS = singletonIds.has(a._id) ? 0 : 1;
  const bS = singletonIds.has(b._id) ? 0 : 1;
  if (aS !== bS) return aS - bS;
  if (a._type !== b._type) return a._type.localeCompare(b._type);
  return a._id.localeCompare(b._id);
});

// Schrijf naar JSON
const outPath = resolve(__dirname, 'seed-export.json');
writeFileSync(outPath, JSON.stringify(cleaned, null, 2));

// Samenvatting
const types = {};
cleaned.forEach(d => { types[d._type] = (types[d._type] || 0) + 1; });

console.log(`\n${cleaned.length} documenten geëxporteerd naar seed-export.json\n`);
for (const [type, count] of Object.entries(types).sort()) {
  console.log(`  ${type}: ${count}`);
}
console.log('\nKlaar! Vergeet niet te committen als je tevreden bent.');
