/**
 * Cleanup Script — Verwijder oud `categorie` string veld
 *
 * ⚠️ NIET UITVOEREN totdat alle events gemigreerd en geverifieerd zijn.
 * Dit script verwijdert het oude `categorie` string veld van alle agendaEvent docs.
 *
 * Gebruik (pas na verificatie): node scripts/cleanup-old-categorie.js
 */

import { createClient } from '@sanity/client';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from './lib/load-env.js';

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

// Verificatie: check dat alle events een categorieRef hebben
const eventsZonderRef = await client.fetch(
  `*[_type == "agendaEvent" && defined(categorie) && !defined(categorieRef)]{ _id, categorie }`
);

if (eventsZonderRef.length > 0) {
  console.log('❌ Er zijn nog events ZONDER categorieRef:');
  for (const e of eventsZonderRef) {
    console.log(`  - ${e._id}: "${e.categorie}"`);
  }
  console.log('\nVoer eerst seed-categories.js uit. Cleanup afgebroken.');
  process.exit(1);
}

// Cleanup
const eventsMetOud = await client.fetch(
  `*[_type == "agendaEvent" && defined(categorie)]{ _id }`
);

if (eventsMetOud.length === 0) {
  console.log('✅ Geen events met oud categorie veld. Niets te doen.');
  process.exit(0);
}

console.log(`🗑️ Verwijder oud categorie veld van ${eventsMetOud.length} events...`);

for (const event of eventsMetOud) {
  await client.patch(event._id).unset(['categorie']).commit();
  console.log(`  ✓ ${event._id}`);
}

console.log(`\n✅ Cleanup voltooid: ${eventsMetOud.length} events bijgewerkt.`);
