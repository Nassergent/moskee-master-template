/**
 * Fleet Telemetry Ping — Het Digitale Waqf
 *
 * Stuurt een status-rapport naar het Fleet Hub intake endpoint.
 * Gebruik: npm run ping            → status "success"
 *          npm run ping -- failed  → status "failed"
 *
 * Fail-open: bij ontbrekende env vars of netwerk-fout → console.warn + exit 0
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from './lib/load-env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── .env laden ──
loadEnv(import.meta.url);

// ── Versie uit package.json (altijd met v-prefix) ──
let version = 'unknown';
try {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf-8'));
  const raw = pkg.version || 'unknown';
  version = raw.startsWith('v') ? raw : `v${raw}`;
} catch { /* package.json niet leesbaar */ }

// ── Vereiste env vars ──
const tenantId = process.env.TENANT_ID;
const cronSecret = process.env.CRON_SECRET;
const hubUrl = process.env.HUB_TELEMETRY_URL;

if (!tenantId || !cronSecret || !hubUrl) {
  console.warn('⚠ Fleet telemetry overgeslagen: TENANT_ID, CRON_SECRET of HUB_TELEMETRY_URL ontbreekt in .env');
  process.exit(0);
}

// ── Status uit CLI args ──
const status = process.argv.includes('failed') ? 'failed' : 'success';

// ── Ping versturen ──
try {
  const response = await fetch(hubUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-fleet-secret': cronSecret,
    },
    body: JSON.stringify({
      tenantId,
      version,
      status,
      timestamp: new Date().toISOString(),
    }),
  });

  if (response.ok) {
    console.log(`✓ Fleet Hub melding verstuurd (${tenantId}, ${version}, ${status})`);
  } else {
    console.warn(`⚠ Fleet Hub antwoordde met ${response.status} — melding niet verwerkt`);
  }
} catch (err) {
  console.warn(`⚠ Fleet Hub niet bereikbaar: ${err.message}`);
  // Fail-open: exit 0
}
