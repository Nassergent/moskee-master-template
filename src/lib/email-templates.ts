/**
 * Branded Email Templates — Het Digitale Waqf
 *
 * Herbruikbare HTML e-mail templates in de huisstijl van de moskee.
 * Gebruikt door: /api/contact, /api/vrijwilligers, /api/mollie-webhook
 */

interface EmailColors {
  primary: string;
  accent: string;
  base: string;
}

const defaultColors: EmailColors = {
  primary: '#1D5C6B',
  accent: '#593B1D',
  base: '#FBF9F7',
};

// ── Shared wrapper ──

function emailWrapper(
  content: string,
  opts: {
    mosqueName: string;
    mosqueEmail?: string;
    colors?: Partial<EmailColors>;
  }
): string {
  const c = { ...defaultColors, ...opts.colors };

  return `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8" /></head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F1F5F9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="background-color: ${c.primary}; padding: 28px 32px; text-align: center;">
              <h1 style="color: white; font-family: Georgia, 'Times New Roman', serif; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">
                ${opts.mosqueName}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; text-align: center; background-color: ${c.base}; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0; font-size: 11px; color: #94A3B8; line-height: 1.6;">
                Verstuurd via <span style="color: ${c.accent}; font-weight: 600;">Het Digitale Waqf</span> voor ${opts.mosqueName}
                ${opts.mosqueEmail ? `<br /><a href="mailto:${opts.mosqueEmail}" style="color: ${c.primary}; text-decoration: none;">${opts.mosqueEmail}</a>` : ''}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Data row helper ──

function dataRow(label: string, value: string, accent: string = defaultColors.accent): string {
  return `
    <tr>
      <td style="padding: 10px 12px; font-size: 13px; color: #64748B; border-bottom: 1px solid #F1F5F9; width: 120px; vertical-align: top; font-weight: 600;">
        ${label}
      </td>
      <td style="padding: 10px 12px; font-size: 14px; color: #1E293B; border-bottom: 1px solid #F1F5F9;">
        ${value}
      </td>
    </tr>`;
}

// ── 1. Contact Notificatie (naar moskee) ──

export function contactNotificationEmail(opts: {
  mosqueName: string;
  mosqueEmail?: string;
  naam: string;
  email: string;
  telefoon?: string;
  onderwerp?: string;
  bericht: string;
  colors?: Partial<EmailColors>;
}): string {
  const c = { ...defaultColors, ...opts.colors };

  const content = `
    <p style="font-size: 14px; color: #64748B; margin: 0 0 20px; line-height: 1.5;">
      Er is een nieuw bericht ontvangen via het contactformulier op uw website.
    </p>

    <!-- Data tabel -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #E2E8F0; border-left: 3px solid ${c.primary}; margin-bottom: 24px;">
      ${dataRow('Naam', opts.naam, c.accent)}
      ${dataRow('E-mail', `<a href="mailto:${opts.email}" style="color: ${c.primary}; text-decoration: none;">${opts.email}</a>`, c.accent)}
      ${dataRow('Telefoon', opts.telefoon || '<span style="color: #CBD5E1;">Niet opgegeven</span>', c.accent)}
      ${dataRow('Onderwerp', opts.onderwerp || '<span style="color: #CBD5E1;">Algemeen</span>', c.accent)}
    </table>

    <!-- Bericht -->
    <div style="background-color: ${c.base}; border: 1px solid #E2E8F0; border-left: 3px solid ${c.accent}; padding: 16px; margin-bottom: 20px;">
      <p style="font-size: 12px; color: #94A3B8; margin: 0 0 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Bericht</p>
      <p style="font-size: 14px; color: #334155; margin: 0; line-height: 1.7; white-space: pre-wrap;">${opts.bericht}</p>
    </div>

    <!-- CTA -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding-top: 8px;">
          <a href="mailto:${opts.email}?subject=Re: ${opts.onderwerp || 'Contactformulier'}"
             style="display: inline-block; background-color: ${c.primary}; color: white; padding: 12px 28px; font-size: 13px; font-weight: 700; text-decoration: none; letter-spacing: 0.3px;">
            Beantwoorden
          </a>
        </td>
      </tr>
    </table>`;

  return emailWrapper(content, {
    mosqueName: opts.mosqueName,
    mosqueEmail: opts.mosqueEmail,
    colors: opts.colors,
  });
}

// ── 2. Vrijwilliger Notificatie (naar moskee) ──

export function volunteerNotificationEmail(opts: {
  mosqueName: string;
  mosqueEmail?: string;
  naam: string;
  email: string;
  telefoon?: string;
  taken: string[];
  bericht?: string;
  colors?: Partial<EmailColors>;
}): string {
  const c = { ...defaultColors, ...opts.colors };

  const takenHtml = opts.taken.length > 0
    ? opts.taken.map(t =>
        `<span style="display: inline-block; background-color: ${c.accent}; color: white; padding: 3px 10px; font-size: 12px; font-weight: 600; margin: 2px 4px 2px 0;">${t}</span>`
      ).join('')
    : '<span style="color: #CBD5E1;">Geen specifieke taak gekozen</span>';

  const content = `
    <div style="background-color: ${c.primary}10; border-left: 3px solid ${c.primary}; padding: 12px 16px; margin-bottom: 24px;">
      <p style="font-size: 14px; color: ${c.primary}; margin: 0; font-weight: 700;">
        Nieuwe vrijwilliger aangemeld
      </p>
      <p style="font-size: 13px; color: #64748B; margin: 4px 0 0;">
        Iemand wil bijdragen aan de gemeenschap. Neem zo snel mogelijk contact op.
      </p>
    </div>

    <!-- Data tabel -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #E2E8F0; border-left: 3px solid ${c.accent}; margin-bottom: 24px;">
      ${dataRow('Naam', opts.naam, c.accent)}
      ${dataRow('E-mail', `<a href="mailto:${opts.email}" style="color: ${c.primary}; text-decoration: none;">${opts.email}</a>`, c.accent)}
      ${dataRow('Telefoon', opts.telefoon || '<span style="color: #CBD5E1;">Niet opgegeven</span>', c.accent)}
      ${dataRow('Taken', takenHtml, c.accent)}
    </table>

    ${opts.bericht ? `
    <div style="background-color: ${c.base}; border: 1px solid #E2E8F0; border-left: 3px solid ${c.accent}; padding: 16px; margin-bottom: 20px;">
      <p style="font-size: 12px; color: #94A3B8; margin: 0 0 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Persoonlijk bericht</p>
      <p style="font-size: 14px; color: #334155; margin: 0; line-height: 1.7; white-space: pre-wrap;">${opts.bericht}</p>
    </div>` : ''}

    <!-- CTA -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding-top: 8px;">
          <a href="mailto:${opts.email}?subject=Vrijwilligerswerk bij ${opts.mosqueName}"
             style="display: inline-block; background-color: ${c.primary}; color: white; padding: 12px 28px; font-size: 13px; font-weight: 700; text-decoration: none; letter-spacing: 0.3px;">
            Contact opnemen
          </a>
        </td>
      </tr>
    </table>`;

  return emailWrapper(content, {
    mosqueName: opts.mosqueName,
    mosqueEmail: opts.mosqueEmail,
    colors: opts.colors,
  });
}

// ── 3. Vrijwilliger Bevestiging (naar de vrijwilliger zelf) ──

// ── 3. Donatie Bevestiging (naar de donateur) ──

export function donationConfirmationEmail(opts: {
  mosqueName: string;
  paidAmount: number;
  safeProjectName: string;
  mosqueEmail?: string;
  colors?: Partial<EmailColors>;
}): string {
  const c = { ...defaultColors, ...opts.colors };

  const content = `
    <p style="font-size: 16px; line-height: 1.6; color: #334155;">Assalamu Alaikum,</p>
    <p style="font-size: 16px; line-height: 1.6; color: #334155;">
      Bedankt voor uw gulle donatie aan <strong>${opts.mosqueName}</strong>.
      Uw bijdrage maakt een verschil voor onze gemeenschap.
    </p>
    <div style="background: white; border: 1px solid #E5E7EB; border-left: 3px solid ${c.accent}; padding: 20px; margin: 24px 0;">
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: #6B7280;">Bedrag</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 18px; color: ${c.primary};">&euro;${opts.paidAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280;">Bestemming</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 500;">${opts.safeProjectName}</td>
        </tr>
      </table>
    </div>
    <p style="font-size: 14px; color: #6B7280; text-align: center; font-style: italic; margin-top: 24px;">
      "De rijkdom van een persoon wordt niet verminderd door Sadaqah."
      <br /><span style="color: ${c.accent}; font-weight: 600;">— Sahih Muslim 2588</span>
    </p>`;

  return emailWrapper(content, {
    mosqueName: opts.mosqueName,
    mosqueEmail: opts.mosqueEmail,
    colors: opts.colors,
  });
}

// ── 4. Vrijwilliger Bevestiging (naar de vrijwilliger zelf) ──

export function volunteerConfirmationEmail(opts: {
  mosqueName: string;
  mosqueEmail?: string;
  naam: string;
  taken: string[];
  colors?: Partial<EmailColors>;
}): string {
  const c = { ...defaultColors, ...opts.colors };

  const takenHtml = opts.taken.length > 0
    ? `
      <div style="background: white; border: 1px solid #E2E8F0; border-left: 3px solid ${c.accent}; padding: 16px; margin: 20px 0;">
        <p style="font-size: 12px; color: #94A3B8; margin: 0 0 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Aangemeld voor</p>
        <p style="font-size: 14px; font-weight: bold; margin: 0; color: #334155;">${opts.taken.join(', ')}</p>
      </div>`
    : '';

  const content = `
    <p style="font-size: 16px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
      Assalamu Alaikum <strong>${opts.naam}</strong>,
    </p>
    <p style="font-size: 15px; line-height: 1.7; color: #475569; margin: 0 0 8px;">
      Bedankt voor je aanmelding als vrijwilliger bij <strong style="color: ${c.primary};">${opts.mosqueName}</strong>.
      Wij waarderen je inzet enorm en nemen binnenkort contact met je op.
    </p>

    ${takenHtml}

    <p style="font-size: 14px; color: #94A3B8; text-align: center; font-style: italic; margin: 28px 0 0; line-height: 1.6;">
      "De beste onder de mensen is degene die het meest nuttig is voor anderen."
      <br /><span style="color: ${c.accent}; font-weight: 600;">— Hadith</span>
    </p>`;

  return emailWrapper(content, {
    mosqueName: opts.mosqueName,
    mosqueEmail: opts.mosqueEmail,
    colors: opts.colors,
  });
}
