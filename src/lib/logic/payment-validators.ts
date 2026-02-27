/**
 * Pure payment validation utilities.
 * No side effects, no fetch, no env vars.
 */

export const PAYMENT_LIMITS = {
  MIN: 1,
  MAX: 10_000,
} as const;

export interface ValidationResult {
  valid: boolean;
  amount?: number;
  error?: string;
}

export function validatePaymentAmount(rawAmount: unknown): ValidationResult {
  // Convert to string first for strict validation
  const str = String(rawAmount ?? '').trim();

  // Reject scientific notation, non-numeric chars, and more than 2 decimals
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    return {
      valid: false,
      error: 'Ongeldig bedragformaat. Gebruik een getal met maximaal 2 decimalen.',
    };
  }

  const numAmount = parseFloat(str);

  if (isNaN(numAmount) || numAmount < PAYMENT_LIMITS.MIN || numAmount > PAYMENT_LIMITS.MAX) {
    return {
      valid: false,
      error: `Ongeldig bedrag (min \u20ac${PAYMENT_LIMITS.MIN}, max \u20ac${PAYMENT_LIMITS.MAX.toLocaleString('nl-BE')}).`,
    };
  }

  return { valid: true, amount: numAmount };
}

/**
 * Convert Mollie amount string to integer cents.
 * @deprecated Use `stringToCents` from `webhook-validators.ts` instead (true string-based, no floats).
 * Kept for backward compatibility (email template uses it via payment-service).
 */
export function parseCurrencyAmountCents(value: string): number {
  return Math.round(parseFloat(value) * 100);
}

/** Convert cents to display euros (for email templates, UI) */
export function centsToEuros(cents: number): number {
  return cents / 100;
}

// ── IBAN Validation (MOD97, ISO 13616) ──────────────────────────

const SEPA_COUNTRIES = new Set([
  'BE', 'NL', 'DE', 'FR', 'LU', 'IT', 'ES', 'PT', 'AT', 'IE',
  'FI', 'GR', 'SI', 'SK', 'EE', 'LV', 'LT', 'CY', 'MT',
]);

export interface IbanValidationResult {
  valid: boolean;
  cleanIban?: string;
  error?: string;
}

export function validateIban(raw: unknown): IbanValidationResult {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { valid: false, error: 'Geen IBAN opgegeven.' };
  }

  const clean = raw.replace(/\s/g, '').toUpperCase();

  // Format check
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(clean)) {
    return { valid: false, error: 'Ongeldig IBAN-formaat.' };
  }

  // Length check (ISO 13616: 15-34)
  if (clean.length < 15 || clean.length > 34) {
    return { valid: false, error: 'IBAN-lengte is ongeldig (15-34 tekens).' };
  }

  // SEPA country check
  const country = clean.slice(0, 2);
  if (!SEPA_COUNTRIES.has(country)) {
    return { valid: false, error: `Landcode "${country}" is geen SEPA-land.` };
  }

  // MOD97 check: rearrange (move first 4 chars to end)
  const rearranged = clean.slice(4) + clean.slice(0, 4);

  // Convert letters to digits (A=10, B=11, ..., Z=35)
  let numericString = '';
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      numericString += (code - 55).toString();
    } else {
      numericString += ch;
    }
  }

  // Digit-stream MOD97 (no BigInt)
  let remainder = 0;
  for (const ch of numericString) {
    remainder = (remainder * 10 + (ch.charCodeAt(0) - 48)) % 97;
  }

  if (remainder !== 1) {
    return { valid: false, error: 'Dit IBAN-nummer is ongeldig. Controleer de landcode en cijferreeks.' };
  }

  return { valid: true, cleanIban: clean };
}

/** Determine if a project name should trigger a Sanity amount update */
export function shouldUpdateProject(projectName: string | undefined): boolean {
  return !!(
    projectName &&
    projectName !== 'Algemeen' &&
    projectName !== 'Algemene Sadaqa'
  );
}
