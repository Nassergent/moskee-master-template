/**
 * Donate Service — Mollie payment creation for donations.
 * Encapsulates Mollie client setup, description building, and payment object construction.
 */
import { createMollieClient } from '@mollie/api-client';
import { fetchSettings } from '../lib/sanity';
import { generateCorrelationId } from '../lib/logic/webhook-validators';
import { formatLog } from '../lib/logic/logger';

export interface DonatePaymentInput {
  amount: number;
  projectId: string;
  projectName: string;
  email: string;
  frequency: string;
  siteOrigin: string;
}

export interface DonatePaymentResult {
  checkoutUrl: string;
}

/** Build a human-readable payment description based on project context. */
function buildDescription(projectId: string, projectName: string, mosqueName: string): string {
  return projectId && projectId !== 'algemeen'
    ? `Donatie: ${projectName} — ${mosqueName}`
    : `Donatie — ${mosqueName}`;
}

/** Create a Mollie payment for a donation. Returns checkout URL on success. */
export async function createDonationPayment(input: DonatePaymentInput): Promise<DonatePaymentResult> {
  const mollieKey = import.meta.env.MOLLIE_API_KEY;
  if (!mollieKey) {
    console.error(formatLog('error', 'donate_config', { reason: 'MOLLIE_API_KEY not set' }));
    throw new Error('Betalingen zijn momenteel niet beschikbaar.');
  }

  const settings = await fetchSettings();
  const mosqueName = settings?.mosqueName || 'Moskee';
  const tenantId = import.meta.env.SANITY_PROJECT_ID || import.meta.env.PUBLIC_SANITY_PROJECT_ID || 'default';
  const correlationId = generateCorrelationId();
  const description = buildDescription(input.projectId, input.projectName, mosqueName);

  const mollieClient = createMollieClient({ apiKey: mollieKey });

  const payment = await mollieClient.payments.create({
    amount: {
      currency: 'EUR',
      value: input.amount.toFixed(2),
    },
    description,
    redirectUrl: `${input.siteOrigin}/bedankt?bedrag=${input.amount.toFixed(2)}&bestemming=${encodeURIComponent(input.projectName)}`,
    webhookUrl: `${input.siteOrigin}/api/mollie-webhook`,
    metadata: {
      projectId: input.projectId || undefined,
      projectName: input.projectName,
      tenantId,
      correlationId,
      frequency: input.frequency,
      project: input.projectName,  // Legacy: kept for in-flight backward compat
      email: input.email,
    },
  });

  return { checkoutUrl: payment.getCheckoutUrl()! };
}
