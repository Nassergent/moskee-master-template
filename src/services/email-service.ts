/**
 * Email Service — side effects allowed.
 * Handles all Resend email sending.
 */

import { Resend } from 'resend';
import { fetchSettings } from '../lib/sanity';
import { contactNotificationEmail, volunteerNotificationEmail, volunteerConfirmationEmail } from '../lib/email-templates';

interface SettingsColors {
  primary?: string;
  accent?: string;
  base?: string;
}

function getColors(theme: any): SettingsColors | undefined {
  if (!theme) return undefined;
  return {
    primary: theme.primaryColor,
    accent: theme.accentColor,
    base: theme.baseColor,
  };
}

/**
 * Send contact form notification to mosque email.
 */
export async function sendContactNotification(opts: {
  naam: string;
  email: string;
  telefoon?: string;
  onderwerp?: string;
  bericht: string;
}): Promise<void> {
  const apiKey = import.meta.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 're_xxxxxxxxxxxx') return;

  const settings = await fetchSettings();
  const mosqueName = settings?.mosqueName || 'Onze Moskee';
  const contactEmail = settings?.email || '';

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: `${mosqueName} <onboarding@resend.dev>`,
    to: [contactEmail],
    replyTo: opts.email,
    subject: `\uD83D\uDCE9 Contactformulier: ${opts.onderwerp || 'Algemeen'} — ${opts.naam}`,
    html: contactNotificationEmail({
      mosqueName,
      mosqueEmail: contactEmail,
      naam: opts.naam,
      email: opts.email,
      telefoon: opts.telefoon,
      onderwerp: opts.onderwerp,
      bericht: opts.bericht,
      colors: getColors(settings?.theme),
    }),
  });
}

/**
 * Send volunteer notification + confirmation emails.
 */
export async function sendVolunteerEmails(opts: {
  naam: string;
  email: string;
  telefoon?: string;
  taken: string[];
  bericht?: string;
}): Promise<void> {
  const resendKey = import.meta.env.RESEND_API_KEY;
  if (!resendKey || resendKey === 're_xxxxxxxxxxxx') return;

  const settings = await fetchSettings();
  const mosqueName = settings?.mosqueName || 'Onze Moskee';
  const mosqueEmail = settings?.email;
  const colors = getColors(settings?.theme);

  const resend = new Resend(resendKey);

  // 1. Notification to mosque
  if (mosqueEmail) {
    await resend.emails.send({
      from: `${mosqueName} <onboarding@resend.dev>`,
      to: [mosqueEmail],
      replyTo: opts.email,
      subject: `\uD83D\uDC65 Nieuwe vrijwilliger: ${opts.naam}`,
      html: volunteerNotificationEmail({
        mosqueName,
        mosqueEmail,
        naam: opts.naam,
        email: opts.email,
        telefoon: opts.telefoon,
        taken: opts.taken,
        bericht: opts.bericht,
        colors,
      }),
    });
  }

  // 2. Confirmation to volunteer
  await resend.emails.send({
    from: `${mosqueName} <onboarding@resend.dev>`,
    to: [opts.email],
    replyTo: mosqueEmail || undefined,
    subject: `Welkom als vrijwilliger bij ${mosqueName}`,
    html: volunteerConfirmationEmail({
      mosqueName,
      mosqueEmail,
      naam: opts.naam,
      taken: opts.taken,
      colors,
    }),
  });
}
