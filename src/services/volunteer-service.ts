/**
 * volunteer-service.ts — Vrijwilliger aanmelding opslaan in Sanity
 *
 * Compartiment: SERVICES
 * Side-effects: schrijft naar Sanity CMS.
 */

import { writeClient } from '../../sanity/lib/client';

interface CreateVolunteerData {
  naam: string;
  email: string;
  telefoon: string;
  taken: string[];
  bericht: string;
}

/** Maak een nieuw vrijwilliger document aan in Sanity */
export async function createVolunteer(data: CreateVolunteerData): Promise<void> {
  await writeClient.create({
    _type: 'volunteer',
    naam: data.naam,
    email: data.email,
    telefoon: data.telefoon,
    taken: data.taken,
    bericht: data.bericht,
    aanmeldDatum: new Date().toISOString(),
    status: 'nieuw',
  });
}
