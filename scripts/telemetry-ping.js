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

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── .env laden (zelfde patroon als seed-data.js) ──
const envPath = resolve(__dirname, '..', '.env');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([\w.]+)\s*=\s*"?(.*?)"?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
} catch { /* .env niet gevonden — gebruik bestaande env vars */ }

// ── Versie uit package.json ──
let version = 'unknown';
try {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf-8'));
  version = pkg.version || 'unknown';
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
    console.log(`✓ Fleet Hub melding verstuurd (${tenantId}, v${version}, ${status})`);
  } else {
    console.warn(`⚠ Fleet Hub antwoordde met ${response.status} — melding niet verwerkt`);
  }
} catch (err) {
  console.warn(`⚠ Fleet Hub niet bereikbaar: ${err.message}`);
  // Fail-open: exit 0
}
