/**
 * EPC069-12 QR code generation for SEPA bank transfers.
 * Server-side only — outputs SVG string (no client JS).
 */
import QRCode from 'qrcode';
import { validateIban } from './payment-validators';

export interface QrResult {
  success: true;
  svg: string;
}

export interface QrError {
  success: false;
  error: string;
}

export type QrOutcome = QrResult | QrError;

export async function generateEpcQrCode(
  iban: string | undefined | null,
  name: string | undefined | null,
): Promise<QrOutcome> {
  if (!iban || !name) {
    return { success: false, error: 'IBAN en begunstigde naam zijn verplicht.' };
  }

  const cleanIban = iban.replace(/\s/g, '').toUpperCase();

  if (cleanIban.length < 15 || cleanIban.length > 34) {
    return { success: false, error: 'IBAN-lengte is ongeldig.' };
  }

  // Validate IBAN with MOD97
  const validation = validateIban(cleanIban);
  if (!validation.valid) {
    return { success: false, error: validation.error || 'Ongeldig IBAN.' };
  }

  // Sanitize beneficiary name: strip newlines, trim, max 70 chars
  const cleanName = name.replace(/[\r\n]/g, ' ').trim().slice(0, 70);
  if (cleanName.length === 0) {
    return { success: false, error: 'Begunstigde naam is leeg.' };
  }

  // EPC069-12 payload (SCT = SEPA Credit Transfer)
  const payload = [
    'BCD',           // Service Tag
    '002',           // Version
    '1',             // Character set (UTF-8)
    'SCT',           // Identification
    '',              // BIC (optional)
    cleanName,       // Beneficiary name
    cleanIban,       // IBAN
    '',              // Amount (empty = open amount)
    '',              // Purpose code
    '',              // Remittance reference
    'Sadaqa via Ummah.be', // Remittance text
    '',              // Information
  ].join('\n');

  try {
    const svg = await QRCode.toString(payload, {
      type: 'svg',
      margin: 4,
      errorCorrectionLevel: 'M',
      width: 300,
    });

    return { success: true, svg };
  } catch (err) {
    return { success: false, error: 'QR-code generatie mislukt.' };
  }
}
