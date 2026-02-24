/**
 * Pure webhook validation utilities.
 * No side effects, no fetch, no env vars.
 */

// ── Types ──

export interface WebhookMetadata {
  projectId: string;
  tenantId: string;
  correlationId: string;
  projectName: string;
  frequency?: string;
  email?: string;
}

// ── HMAC Verification (timing-safe via crypto.subtle.verify) ──

/**
 * Verify Mollie HMAC-SHA256 signature using crypto.subtle.verify,
 * which is inherently timing-safe (no string comparison).
 */
export async function verifyHmacTimingSafe(
  secret: string,
  body: string,
  signatureBase64: string
): Promise<boolean> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  // Decode the base64 signature to ArrayBuffer
  const signatureBytes = Uint8Array.from(atob(signatureBase64), (c) => c.charCodeAt(0));

  return crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(body));
}

// ── Payment ID Validation ──

/** Check if a payment ID matches Mollie's `tr_*` format */
export function isValidPaymentId(id: unknown): id is string {
  return typeof id === 'string' && /^tr_[a-zA-Z0-9]+$/.test(id);
}

// ── Amount Conversion (string-based, no floats) ──

/**
 * Convert a currency string like "19.99" to integer cents (1999).
 * Uses string splitting — no floating point involved.
 */
export function stringToCents(value: string): number {
  const trimmed = value.trim();

  // Validate format: digits, optional dot with 1-2 decimals
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error(`Invalid currency string: "${value}"`);
  }

  const parts = trimmed.split('.');
  const whole = parseInt(parts[0], 10);
  const fraction = parts[1] ? parts[1].padEnd(2, '0') : '00';

  return whole * 100 + parseInt(fraction, 10);
}

// ── Webhook Metadata Parsing ──

/**
 * Parse and validate webhook metadata from Mollie payment.
 * Returns null if required fields are missing.
 */
export function parseWebhookMetadata(
  raw: Record<string, unknown> | null | undefined
): WebhookMetadata | null {
  if (!raw || typeof raw !== 'object') return null;

  const projectId = typeof raw.projectId === 'string' ? raw.projectId.trim() : '';
  const tenantId = typeof raw.tenantId === 'string' ? raw.tenantId.trim() : '';
  const correlationId = typeof raw.correlationId === 'string' ? raw.correlationId.trim() : '';
  const projectName = typeof raw.projectName === 'string' ? raw.projectName.trim() : '';

  // projectId + tenantId are required for the new flow
  if (!projectId || !tenantId) return null;

  return {
    projectId,
    tenantId,
    correlationId: correlationId || generateCorrelationId(),
    projectName: projectName || 'Onbekend project',
    frequency: typeof raw.frequency === 'string' ? raw.frequency : undefined,
    email: typeof raw.email === 'string' ? raw.email : undefined,
  };
}

// ── Correlation ID ──

/** Generate a unique correlation ID for request tracing */
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}
