/**
 * event-registration-service.ts — Evenement inschrijving opslaan in Sanity
 *
 * Compartiment: SERVICES
 * Side-effects: schrijft naar Sanity CMS.
 */

import { writeClient } from '../../sanity/lib/client';

interface CreateEventRegistrationData {
  eventId: string;
  name: string;
  email: string;
  phone: string;
  partySize: number;
  notes: string;
}

export async function createEventRegistration(data: CreateEventRegistrationData): Promise<void> {
  await writeClient.create({
    _type: 'eventRegistration',
    eventRef: { _type: 'reference', _ref: data.eventId },
    name: data.name,
    email: data.email,
    phone: data.phone,
    partySize: data.partySize,
    notes: data.notes,
    createdAt: new Date().toISOString(),
    status: 'submitted',
  });
}
