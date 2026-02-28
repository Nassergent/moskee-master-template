/**
 * email-templates.test.ts — Email template tests
 *
 * Coverage:
 * EMAIL-01: contactNotificationEmail generates valid HTML
 * EMAIL-02: volunteerNotificationEmail generates valid HTML
 * EMAIL-03: donationConfirmationEmail generates valid HTML
 * EMAIL-04: eventRegistrationNotificationEmail generates valid HTML
 * EMAIL-05: volunteerConfirmationEmail generates valid HTML
 * EMAIL-06: XSS — script tags are escaped in contact email
 * EMAIL-07: XSS — script tags are escaped in volunteer email
 * EMAIL-08: XSS — script tags are escaped in event email
 * EMAIL-09: Snapshot — contactNotificationEmail output is stable
 * EMAIL-10: Snapshot — donationConfirmationEmail output is stable
 */

import { describe, it, expect } from 'vitest';
import {
  contactNotificationEmail,
  volunteerNotificationEmail,
  donationConfirmationEmail,
  eventRegistrationNotificationEmail,
  eventRegistrationConfirmationEmail,
  volunteerConfirmationEmail,
} from './email-templates';

// ── Shared test data ──

const baseOpts = {
  mosqueName: 'Al-Fath Moskee',
  mosqueEmail: 'info@alfath.be',
  colors: { primary: '#1D5C6B', accent: '#C9A983', base: '#FBF9F7' },
};

// ── Structure tests ──

describe('Email template structure', () => {
  it('EMAIL-01: contactNotificationEmail generates valid HTML', () => {
    const html = contactNotificationEmail({
      ...baseOpts,
      naam: 'Ahmed',
      email: 'ahmed@test.be',
      telefoon: '0412345678',
      onderwerp: 'Vraag',
      bericht: 'Hallo, dit is een test bericht.',
    });

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Al-Fath Moskee');
    expect(html).toContain('Ahmed');
    expect(html).toContain('ahmed@test.be');
    expect(html).toContain('Hallo, dit is een test bericht.');
    expect(html).toContain('Het Digitale Waqf');
  });

  it('EMAIL-02: volunteerNotificationEmail generates valid HTML', () => {
    const html = volunteerNotificationEmail({
      ...baseOpts,
      naam: 'Fatima',
      email: 'fatima@test.be',
      taken: ['Schoonmaak', 'Keuken'],
      bericht: 'Ik help graag mee',
    });

    expect(html).toContain('Fatima');
    expect(html).toContain('Schoonmaak');
    expect(html).toContain('Keuken');
    expect(html).toContain('Nieuwe vrijwilliger aangemeld');
  });

  it('EMAIL-03: donationConfirmationEmail generates valid HTML', () => {
    const html = donationConfirmationEmail({
      ...baseOpts,
      paidAmount: 25.00,
      safeProjectName: 'Ramadan Voedselpakketten',
    });

    expect(html).toContain('25.00');
    expect(html).toContain('Ramadan Voedselpakketten');
    expect(html).toContain('Bedankt voor uw gulle donatie');
    expect(html).toContain('Sahih Muslim 2588');
  });

  it('EMAIL-04: eventRegistrationNotificationEmail generates valid HTML', () => {
    const html = eventRegistrationNotificationEmail({
      ...baseOpts,
      name: 'Hassan',
      email: 'hassan@test.be',
      partySize: 3,
      eventTitle: 'Iftar 2026',
      notes: 'We komen met 3 personen',
    });

    expect(html).toContain('Hassan');
    expect(html).toContain('Iftar 2026');
    expect(html).toContain('3');
    expect(html).toContain('We komen met 3 personen');
  });

  it('EMAIL-05: volunteerConfirmationEmail generates valid HTML', () => {
    const html = volunteerConfirmationEmail({
      ...baseOpts,
      naam: 'Youssef',
      taken: ['Educatie'],
    });

    expect(html).toContain('Youssef');
    expect(html).toContain('Educatie');
    expect(html).toContain('vrijwilliger');
  });
});

// ── XSS Protection tests ──

describe('Email XSS protection', () => {
  const xssPayload = '<script>alert("xss")</script>';
  const escapedScript = '&lt;script&gt;';

  it('EMAIL-06: script tags escaped in contact email', () => {
    const html = contactNotificationEmail({
      ...baseOpts,
      naam: xssPayload,
      email: 'test@test.be',
      bericht: xssPayload,
    });

    expect(html).not.toContain('<script>');
    expect(html).toContain(escapedScript);
  });

  it('EMAIL-07: script tags escaped in volunteer email', () => {
    const html = volunteerNotificationEmail({
      ...baseOpts,
      naam: xssPayload,
      email: 'test@test.be',
      taken: [xssPayload],
    });

    expect(html).not.toContain('<script>alert');
    expect(html).toContain(escapedScript);
  });

  it('EMAIL-08: script tags escaped in event email', () => {
    const html = eventRegistrationNotificationEmail({
      ...baseOpts,
      name: xssPayload,
      email: 'test@test.be',
      partySize: 1,
      eventTitle: xssPayload,
    });

    expect(html).not.toContain('<script>alert');
    expect(html).toContain(escapedScript);
  });
});

// ── Snapshot tests ──

describe('Email template snapshots', () => {
  it('EMAIL-09: contactNotificationEmail snapshot is stable', () => {
    const html = contactNotificationEmail({
      ...baseOpts,
      naam: 'Test User',
      email: 'user@test.be',
      bericht: 'Test bericht voor snapshot.',
    });

    expect(html).toMatchSnapshot();
  });

  it('EMAIL-10: donationConfirmationEmail snapshot is stable', () => {
    const html = donationConfirmationEmail({
      ...baseOpts,
      paidAmount: 50.00,
      safeProjectName: 'Algemene Sadaqa',
    });

    expect(html).toMatchSnapshot();
  });
});
