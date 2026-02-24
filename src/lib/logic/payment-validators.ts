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

/** Determine if a project name should trigger a Sanity amount update */
export function shouldUpdateProject(projectName: string | undefined): boolean {
  return !!(
    projectName &&
    projectName !== 'Algemeen' &&
    projectName !== 'Algemene Sadaqa'
  );
}
