/**
 * Migratiescript — Hernoem etiquette velden: title→titel, description→beschrijving
 *
 * Nodig na de schema-update waarbij Engelse veldnamen vervangen zijn door Nederlandse.
 * Veilig om meerdere keren te draaien (idempotent).
 *
 * Gebruik: node scripts/migrate-etiquette-fields.js
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

// Haal alle etiquette docs op die nog oude veldnamen hebben
const docs = await client.fetch(
  `*[_type == "etiquette" && (defined(title) || defined(description))]{ _id, title, description, titel, beschrijving }`
);

if (docs.length === 0) {
  console.log('✅ Geen etiquette documenten met oude veldnamen (title/description). Niets te doen.');
  process.exit(0);
}

console.log(`📝 ${docs.length} etiquette document(en) te migreren...\n`);

let migrated = 0;
let skipped = 0;

for (const doc of docs) {
  // Bepaal de nieuwe waarden (oude waarde als fallback als nieuw veld nog niet bestaat)
  const nieuweTitel = doc.titel || doc.title;
  const nieuweBeschrijving = doc.beschrijving || doc.description;

  if (!doc.title && !doc.description) {
    // Al gemigreerd (heeft alleen titel/beschrijving)
    console.log(`  ⏭️  ${doc._id} — al gemigreerd, skip`);
    skipped++;
    continue;
  }

  const patch = client.patch(doc._id);

  // Zet nieuwe velden
  const setFields = {};
  if (doc.title && !doc.titel) {
    setFields.titel = nieuweTitel;
  }
  if (doc.description && !doc.beschrijving) {
    setFields.beschrijving = nieuweBeschrijving;
  }

  if (Object.keys(setFields).length > 0) {
    patch.set(setFields);
  }

  // Verwijder oude velden
  const unsetFields = [];
  if (doc.title) unsetFields.push('title');
  if (doc.description) unsetFields.push('description');

  if (unsetFields.length > 0) {
    patch.unset(unsetFields);
  }

  await patch.commit();
  console.log(`  ✓ ${doc._id}: ${Object.keys(setFields).join(', ') || 'cleanup'} → ${unsetFields.join(', ')} verwijderd`);
  migrated++;
}

console.log(`\n✅ Migratie voltooid: ${migrated} gemigreerd, ${skipped} overgeslagen.`);
