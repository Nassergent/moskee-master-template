import type { APIRoute } from 'astro';
import { createMollieClient } from '@mollie/api-client';
import { writeClient, sanityClient } from '../../lib/sanity';
import { Resend } from 'resend';
import { checkRateLimit, getClientIp } from '../../lib/security';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Rate limiting op webhook endpoint (bescherming tegen abuse)
    const ip = getClientIp(request);
    if (!(await checkRateLimit(ip, 20, 60_000))) {
      return new Response('Rate limited', { status: 429 });
    }

    const formData = await request.formData();
    const paymentId = formData.get('id') as string;

    if (!paymentId) {
      return new Response('Missing payment ID', { status: 400 });
    }

    const mollieKey = import.meta.env.MOLLIE_API_KEY;
    if (!mollieKey || mollieKey === 'test_xxxxxxxxxxxx') {
      return new Response('OK', { status: 200 });
    }

    // Mollie API valideert het payment ID — een nep ID geeft een error
    const mollieClient = createMollieClient({ apiKey: mollieKey });
    const payment = await mollieClient.payments.get(paymentId);

    // Payment verwerking: status en bedrag worden gelogd bij fouten via console.error

    // Alleen bij succesvolle betaling
    if (payment.status === 'paid') {
      const metadata = payment.metadata as { project?: string; frequency?: string; email?: string } | null;
      const projectName = metadata?.project;
      const paidAmount = parseFloat(payment.amount.value);

      // 1. Update het project bedrag in Sanity
      if (projectName && projectName !== 'Algemeen' && projectName !== 'Algemene Sadaqa') {
        const project = await sanityClient.fetch(
          `*[_type == "project" && titel == $titel][0]{ _id, huidigBedrag }`,
          { titel: projectName }
        );

        if (project?._id) {
          const currentAmount = project.huidigBedrag || 0;
          await writeClient
            .patch(project._id)
            .set({ huidigBedrag: currentAmount + paidAmount })
            .commit();

          // Project bedrag succesvol bijgewerkt in Sanity
        }
      }

      // 2. Stuur bedankmail naar de donateur
      const donorEmail = metadata?.email;
      const resendKey = import.meta.env.RESEND_API_KEY;

      if (donorEmail && resendKey && resendKey !== 're_xxxxxxxxxxxx') {
        try {
          const settings = await sanityClient.fetch(`*[_id == "settings"][0]{ mosqueName, email }`);
          const mosqueName = settings?.mosqueName || 'Onze Moskee';

          const resend = new Resend(resendKey);
          await resend.emails.send({
            from: `${mosqueName} <onboarding@resend.dev>`,
            to: [donorEmail],
            replyTo: settings?.email || undefined,
            subject: `Jazak Allahu Khairan — Bedankt voor uw donatie`,
            html: `
              <div style="font-family: 'Lato', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1E293B;">
                <div style="background-color: #1D5C6B; padding: 32px; text-align: center;">
                  <h1 style="color: white; font-family: 'Philosopher', Georgia, serif; margin: 0; font-size: 28px;">
                    Jazak Allahu Khairan
                  </h1>
                </div>
                <div style="padding: 32px; background-color: #FBF9F7;">
                  <p style="font-size: 16px; line-height: 1.6;">Assalamu Alaikum,</p>
                  <p style="font-size: 16px; line-height: 1.6;">
                    Bedankt voor uw gulle donatie aan <strong>${mosqueName}</strong>.
                    Uw bijdrage maakt een verschil voor onze gemeenschap.
                  </p>
                  <div style="background: white; border: 1px solid #E5E7EB; border-left: 3px solid #593B1D; padding: 20px; margin: 24px 0;">
                    <table style="width: 100%; font-size: 14px;">
                      <tr>
                        <td style="padding: 8px 0; color: #6B7280;">Bedrag</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 18px; color: #1D5C6B;">&euro;${paidAmount.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6B7280;">Bestemming</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 500;">${projectName || 'Algemene Sadaqa'}</td>
                      </tr>
                    </table>
                  </div>
                  <p style="font-size: 14px; color: #6B7280; text-align: center; font-style: italic; margin-top: 24px;">
                    "De rijkdom van een persoon wordt niet verminderd door Sadaqah."
                    <br /><span style="color: #593B1D; font-weight: 600;">— Sahih Muslim 2588</span>
                  </p>
                </div>
                <div style="padding: 16px; text-align: center; font-size: 12px; color: #9CA3AF;">
                  ${mosqueName}${settings?.email ? ` — ${settings.email}` : ''}
                </div>
              </div>
            `,
          });
          // Bedankmail succesvol verstuurd
        } catch (emailErr) {
          console.error('Bedankmail fout:', emailErr);
        }
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Mollie webhook error:', error);
    return new Response('Webhook error', { status: 500 });
  }
};
