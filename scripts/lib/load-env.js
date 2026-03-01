/**
 * Shared .env loader — Het Digitale Waqf
 *
 * Laadt .env variabelen in process.env zonder externe dependencies.
 * Gebruikt door alle seed- en telemetry-scripts.
 *
 * Features:
 * - Correct quote stripping (dubbel EN enkel)
 * - Respecteert bestaande env vars (geen overschrijving)
 * - Skipt lege regels en commentaar (#)
 * - Fail-silent als .env niet bestaat
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Laad .env bestand in process.env
 * @param {string} metaUrl - import.meta.url van het aanroepende script
 */
export function loadEnv(metaUrl) {
  const scriptDir = dirname(fileURLToPath(metaUrl));
  const envPath = resolve(scriptDir, '..', '.env');

  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      // Skip lege regels en commentaar
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const match = trimmed.match(/^([\w.]+)\s*=\s*(.*)$/);
      if (!match) continue;

      const key = match[1];
      let value = match[2].trim();

      // Strip quotes als ze matchen (dubbel of enkel)
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // Bestaande env vars niet overschrijven
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env niet gevonden — gebruik bestaande env vars
  }
}
