/**
 * Payment Service — side effects allowed.
 * Handles Mollie payment processing and Sanity project updates.
 */

import { writeClient } from '../../sanity/lib/client';
import { fetchProjectByTitle, fetchSettings } from '../lib/sanity';
import { parseCurrencyAmountCents, centsToEuros, shouldUpdateProject } from '../lib/logic/payment-validators';
import { escapeHtml } from '../lib/security';
import { donationConfirmationEmail } from '../lib/email-templates';
import { Resend } from 'resend';

interface PaymentMetadata {
  project?: string;
  frequency?: string;
  email?: string;
}

/**
 * Process a successful Mollie payment:
 * 1. Increment project amount in Sanity (unless skipSanityUpdate)
 * 2. Send confirmation email to donor
 */
export async function processSuccessfulPayment(payment: {
  amount: { value: string };
  metadata: PaymentMetadata | null;
  /** When true, skip the Sanity increment (webhook-service already handled it) */
  skipSanityUpdate?: boolean;
}): Promise<void> {
  const metadata = payment.metadata;
  const projectName = metadata?.project;
  const paidAmountCents = parseCurrencyAmountCents(payment.amount.value);

  // 1. Atomic increment in integer cents (no float precision loss)
  //    Skip when called from webhook-service (it handles its own commit with retry)
  if (!payment.skipSanityUpdate && shouldUpdateProject(projectName)) {
    const project = await fetchProjectByTitle(projectName!);
    if (project?._id) {
      await writeClient
        .patch(project._id)
        .inc({ huidigBedragCents: paidAmountCents })
        .commit();
    }
  }

  // 2. Send confirmation email (display amount in euros)
  const donorEmail = metadata?.email;
  const resendKey = import.meta.env.RESEND_API_KEY;

  if (donorEmail && resendKey && resendKey !== 're_xxxxxxxxxxxx') {
    try {
      const settings = await fetchSettings();
      const mosqueName = escapeHtml(settings?.mosqueName || 'Onze Moskee');
      const safeProjectName = escapeHtml(projectName || 'Algemene Sadaqa');

      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: `${settings?.mosqueName || 'Onze Moskee'} <onboarding@resend.dev>`,
        to: [donorEmail],
        replyTo: settings?.email || undefined,
        subject: `Jazak Allahu Khairan — Bedankt voor uw donatie`,
        html: donationConfirmationEmail({
          mosqueName,
          paidAmount: centsToEuros(paidAmountCents),
          safeProjectName,
          mosqueEmail: settings?.email,
        }),
      });
    } catch (emailErr) {
      console.error('Bedankmail fout:', emailErr);
    }
  }
}
