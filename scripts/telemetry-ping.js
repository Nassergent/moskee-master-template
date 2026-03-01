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

// ── Status validatie ──
const VALID_STATUSES = ['success', 'failed'];
if (!VALID_STATUSES.includes(status)) {
  console.warn(`⚠ Ongeldige status "${status}" — verwacht: ${VALID_STATUSES.join(', ')}`);
  process.exit(0);
}

// ── Optioneel failure reason uit env ──
const reason = process.env.FAILURE_REASON || null;

// ── Ping versturen (met 10s timeout) ──
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10_000);

try {
  const response = await fetch(hubUrl, {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      'x-fleet-secret': cronSecret,
    },
    body: JSON.stringify({
      tenantId,
      version,
      status,
      ...(reason && { reason }),
      timestamp: new Date().toISOString(),
    }),
  });

  if (response.ok) {
    console.log(`✓ Fleet Hub melding verstuurd (${tenantId}, ${version}, ${status})`);
  } else {
    const body = await response.text().catch(() => '');
    console.error(`✗ Fleet Hub antwoordde met ${response.status}${body ? `: ${body}` : ''}`);
  }
} catch (err) {
  const msg = err.name === 'AbortError' ? 'timeout na 10s' : err.message;
  console.error(`✗ Fleet Hub niet bereikbaar: ${msg}`);
  // Fail-open: exit 0
} finally {
  clearTimeout(timeout);
}
