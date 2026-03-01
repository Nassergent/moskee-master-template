/**
 * Universele Seed — Het Digitale Waqf
 *
 * Leest seed-export.json en pusht ALLE content naar de target Sanity dataset.
 * Gebruikt createOrReplace (idempotent, deterministische IDs).
 *
 * Gebruik: npm run seed:all
 *
 * Opties:
 *   --dry-run   Toon wat er geseeded zou worden zonder te schrijven
 *   --type=X    Seed alleen documenten van type X (bv. --type=quote)
 */

import { createClient } from '@sanity/client';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from './lib/load-env.js';

// ── .env laden ──
loadEnv(import.meta.url);

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
if (!projectId) throw new Error('Missing PUBLIC_SANITY_PROJECT_ID in .env');

const dataset = process.env.PUBLIC_SANITY_DATASET || 'production';
const token = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_TOKEN || '';
if (!token) throw new Error('Missing SANITY_WRITE_TOKEN or SANITY_API_TOKEN in .env');

const client = createClient({
  projectId,
  dataset,
  useCdn: false,
  apiVersion: '2024-01-01',
  token,
});

// ── Args parsen ──
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const typeFilter = args.find(a => a.startsWith('--type='))?.split('=')[1];

// ── Seed data laden ──
const seedPath = resolve(__dirname, 'seed-export.json');
let allDocs;
try {
  allDocs = JSON.parse(readFileSync(seedPath, 'utf-8'));
} catch (err) {
  console.error('Kan seed-export.json niet lezen:', err.message);
  console.error('Genereer eerst met: npm run seed:export');
  process.exit(1);
}

// Filter op type indien gewenst
if (typeFilter) {
  allDocs = allDocs.filter(d => d._type === typeFilter);
  console.log(`Filter actief: alleen ${typeFilter} (${allDocs.length} docs)\n`);
}

// ── Sorteervolgorde: referenties eerst ──
// Posts moeten vóór agendaEvents (onderwerpHub verwijst naar posts)
// Singletons eerst, dan content types in dependency-volgorde
const typeOrder = {
  settings: 0, contactPage: 0, prayerTimes: 0, homePage: 0,
  homeCards: 0, aboutPage: 0, ramadanOverride: 0, janazahProcedure: 0,
  eventCategorie: 1, etiquette: 2, service: 2, quote: 2,
  lessonProgram: 3, project: 3,
  post: 4,           // posts eerst (onderwerpHub targets)
  agendaEvent: 5,    // events daarna (verwijzen naar posts)
  janazahAlert: 6,
};
allDocs.sort((a, b) => (typeOrder[a._type] ?? 9) - (typeOrder[b._type] ?? 9));

// ── Seed uitvoeren ──
console.log(`Seeding ${allDocs.length} documenten naar ${projectId}/${dataset}...`);
if (dryRun) console.log('(DRY RUN — er wordt niets geschreven)\n');

let success = 0;
let failed = 0;

for (const doc of allDocs) {
  const label = doc.titel || doc.mosqueName || doc.title || doc.tekst?.substring(0, 40) || doc._id;

  if (dryRun) {
    console.log(`  ○ ${doc._type}: ${label} (${doc._id})`);
    success++;
    continue;
  }

  try {
    await client.createOrReplace(doc);
    console.log(`  ✓ ${doc._type}: ${label}`);
    success++;
  } catch (err) {
    console.error(`  ✗ ${doc._type} (${doc._id}): ${err.message}`);
    failed++;
  }
}

console.log(`\nSeed voltooid: ${success} gelukt, ${failed} mislukt.`);
if (failed > 0) process.exit(1);
