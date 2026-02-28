import { sanityClient, freshClient, urlFor } from '../../sanity/lib/client';
export { sanityClient, freshClient, urlFor };

// writeClient is NOT re-exported here — import directly from
// '../../sanity/lib/client' in server-only code (src/services/, src/pages/api/)

// ── Fetch helpers (Sanity CMS is enige bron) ──────────────────────

export async function fetchSettings() {
  try {
    // freshClient: theme/menu wijzigingen moeten direct zichtbaar zijn, geen CDN cache
    const result = await freshClient.fetch(`*[_id == "settings"][0]{ mosqueName, description, logo, logoFooter, favicon, primaryTheme, menuToggles, donateButtonText, volunteerTasks, address, phone, email, whatsapp, socials, iban, legal, timezone, hijriAdjustment, islamicDays, bedanktTekst, payconiqQr }`);
    return result || null;
  } catch (e) {
    console.error('Sanity fetchSettings error:', e);
    return null;
  }
}

export async function fetchDiensten() {
  try {
    const result = await sanityClient.fetch(`*[_type == "service" && actief == true] | order(volgorde asc) {
      _id, titel, "slug": slug.current, beschrijving, inhoud, afbeelding, tijden, volgorde
    }`);
    return result || [];
  } catch (e) {
    console.error('Sanity fetchDiensten error:', e);
    return [];
  }
}

export async function fetchProjecten() {
  try {
    // freshClient: donatiebedragen moeten real-time zijn, geen CDN cache
    const result = await freshClient.fetch(`*[_type == "project" && actief == true] | order(toonOpHomepage desc, _createdAt desc) [0...2] {
      _id, titel, beschrijving, afbeelding, doelbedrag, huidigBedragCents, actief,
      prijsPerEenheid, eenheid, toonOpHomepage,
      citaat->{ tekst, tekstArabisch, bron }
    }`);
    return result || [];
  } catch (e) {
    console.error('Sanity fetchProjecten error:', e);
    return [];
  }
}

export async function fetchNieuws() {
  try {
    const result = await sanityClient.fetch(`*[_type == "post" && gepubliceerd == true && !defined(onderwerpHub)] | order(datum desc) {
      _id, titel, "slug": slug.current, datum, samenvatting, inhoud, afbeelding, postType
    }`);
    return result || [];
  } catch (e) {
    console.error('Sanity fetchNieuws error:', e);
    return [];
  }
}

export async function fetchPrayerTimes() {
  try {
    const result = await sanityClient.fetch(`*[_id == "prayerTimes"][0]{
      timezone,
      coordinates,
      method,
      madhab,
      highLatitudeRule,
      adhanOffsets,
      iqamaConfig,
      jumuahShifts,
      jumuahNote,
      footerNote
    }`);
    return result || null;
  } catch (e) {
    console.error('Sanity fetchPrayerTimes error:', e);
    return null;
  }
}

export async function fetchActueel() {
  try {
    const result = await sanityClient.fetch(`*[
      _type == "post" && gepubliceerd == true
    ] | order(_createdAt desc) [0...3] {
      _id,
      _type,
      _createdAt,
      "titel": titel,
      "slug": slug.current,
      "beschrijving": samenvatting,
      "href": "/nieuws/" + slug.current,
      postType
    }`);
    return result || [];
  } catch (e) {
    console.error('Sanity fetchActueel error:', e);
    return [];
  }
}

export async function fetchQuote(categorie: string = 'donaties') {
  try {
    const result = await sanityClient.fetch(`*[_type == "quote" && actief == true && categorie == $categorie] {
      _id, tekst, tekstArabisch, bron
    }`, { categorie });
    if (result && result.length > 0) {
      return result[Math.floor(Math.random() * result.length)];
    }
    return null;
  } catch (e) {
    console.error('Sanity fetchQuote error:', e);
    return null;
  }
}

export async function fetchEtiquette() {
  try {
    const result = await sanityClient.fetch(`*[_type == "etiquette" && gepubliceerd == true] | order(volgorde asc) {
      _id, title, description, volgorde
    }`);
    return result || [];
  } catch (e) {
    console.error('Sanity fetchEtiquette error:', e);
    return [];
  }
}

// ── Centralized query helpers (used by services + API routes) ────────

export async function fetchProjectByTitle(titel: string) {
  try {
    // freshClient: webhook moet actuele _id ophalen
    return await freshClient.fetch(
      `*[_type == "project" && titel == $titel][0]{ _id }`,
      { titel }
    );
  } catch (e) {
    console.error('Sanity fetchProjectByTitle error:', e);
    return null;
  }
}

export async function fetchProjectById(id: string) {
  try {
    return await freshClient.fetch(
      `*[_type == "project" && _id == $id][0]{ _id, titel, huidigBedragCents }`,
      { id }
    );
  } catch (e) {
    console.error('Sanity fetchProjectById error:', e);
    return null;
  }
}

export async function fetchAllActiveProjectTotals() {
  try {
    return await freshClient.fetch(
      `*[_type == "project" && actief == true]{ _id, titel, huidigBedragCents }`
    ) || [];
  } catch (e) {
    console.error('Sanity fetchAllActiveProjectTotals error:', e);
    return [];
  }
}

// ── Nieuwe fetch helpers (page singletons) ───────────────────────

export async function fetchHomePage() {
  try {
    const result = await sanityClient.fetch(`*[_id == "homePage"][0]{
      heroTagline, heroTitle, heroSubtitle, heroCta, heroImage, toonActueel, badges, badgeKleur
    }`);
    return result || null;
  } catch (e) {
    console.error('Sanity fetchHomePage error:', e);
    return null;
  }
}

// Card projectie — herbruikt voor card1, card2, card3
const CARD_PROJECTION = `{
  ingeschakeld, variant,
  evenementTitel, evenementTitelArabisch, evenementBeschrijving, evenementDatum, agendaLink,
  komendeDatumsFallback[]{ naam, naamArabisch, datum },
  donatieProject->{ _id, titel, beschrijving, afbeelding, doelbedrag, huidigBedragCents, prijsPerEenheid, eenheid, actief },
  donatieCtaLabelOverride,
  downloadTitel, downloadBeschrijving,
  "downloadAfbeeldingUrl": downloadAfbeelding.asset->url,
  "downloadBestandUrl": downloadBestand.asset->url,
  downloadCtaLabel,
  aangepastTitel, aangepastBeschrijving, aangepastCtaLabel, aangepastCtaUrl,
  "aangepastAfbeeldingUrl": aangepastAfbeelding.asset->url
}`;

export async function fetchHomeCards() {
  try {
    const result = await freshClient.fetch(`*[_id == "homeCards"][0]{
      ingeschakeld,
      card1 ${CARD_PROJECTION},
      card2 ${CARD_PROJECTION},
      card3 ${CARD_PROJECTION}
    }`);
    return result || null;
  } catch (e) {
    console.error('Sanity fetchHomeCards error:', e);
    return null;
  }
}

export async function fetchAboutPage() {
  try {
    const result = await sanityClient.fetch(`*[_id == "aboutPage"][0]{
      heroTitle, heroSubtitle,
      missieTitle, missieText, missieImage,
      kengetallenTonen, kengetallen,
      geschiedenisTonen, geschiedenisTitle, tijdlijn,
      waardenTonen, waardenTitle, waarden,
      teamTonen, teamTitle, team,
      vrijwilligerTonen, vrijwilligerTitle, vrijwilligerText
    }`);
    return result || null;
  } catch (e) {
    console.error('Sanity fetchAboutPage error:', e);
    return null;
  }
}

export async function fetchContactPage() {
  try {
    const result = await sanityClient.fetch(`*[_id == "contactPage"][0]{
      introText, openingstijden, onderwerpen
    }`);
    return result || null;
  } catch (e) {
    console.error('Sanity fetchContactPage error:', e);
    return null;
  }
}

// ── Topic Hub (Nieuws ↔ Agenda koppeling) ──

export async function fetchPost(slug: string) {
  try {
    const result = await sanityClient.fetch(`*[_type == "post" && slug.current == $slug && gepubliceerd == true][0]{
      _id, titel, "slug": slug.current, datum, samenvatting, inhoud, afbeelding, postType,
      onderwerpHub->{ _id, titel, "slug": slug.current }
    }`, { slug });
    return result || null;
  } catch (e) {
    console.error('Sanity fetchPost error:', e);
    return null;
  }
}

export async function fetchTopicHubRelated(hubId: string) {
  try {
    const [relatedPosts, relatedEvents] = await Promise.all([
      sanityClient.fetch(`*[_type == "post" && onderwerpHub._ref == $hubId && gepubliceerd == true] | order(datum desc) {
        _id, titel, "slug": slug.current, datum, samenvatting, afbeelding, postType
      }`, { hubId }),
      sanityClient.fetch(`*[_type == "agendaEvent" && onderwerpHub._ref == $hubId && gepubliceerd == true] | order(startDatum asc) {
        _id, titel, "slug": slug.current, startDatum, eindDatum, "locatie": select(locatie == "anders" => locatieAnders, locatie),
        "categorie": coalesce(categorieRef->titel, categorie),
        "categorieKleur": categorieRef->kleur,
        afbeelding
      }`, { hubId }),
    ]);
    return {
      posts: relatedPosts || [],
      events: relatedEvents || [],
    };
  } catch (e) {
    console.error('Sanity fetchTopicHubRelated error:', e);
    return { posts: [], events: [] };
  }
}

// ── Lessen & Ramadan ──

export async function fetchLessonPrograms() {
  try {
    const result = await sanityClient.fetch(`*[_type == "lessonProgram" && actief == true] | order(volgorde asc) {
      _id, titel, categorie, beschrijving, inhoud, afbeelding,
      maxCapaciteit, inschrijvingOpen, vrijwilligersLink, rooster, volgorde
    }`);
    return result || [];
  } catch (e) {
    console.error('Sanity fetchLessonPrograms error:', e);
    return [];
  }
}

export async function fetchRamadanOverride() {
  try {
    const result = await sanityClient.fetch(`*[_id == "ramadanOverride"][0]{
      ingeschakeld, omschrijving, rooster
    }`);
    return result || null;
  } catch (e) {
    console.error('Sanity fetchRamadanOverride error:', e);
    return null;
  }
}

// ── Event Categorieën ──

export async function fetchEventCategories() {
  try {
    const result = await sanityClient.fetch(`*[_type == "eventCategorie"] | order(volgorde asc) {
      _id, titel, "slug": slug.current, kleur, icoon, volgorde
    }`);
    return result || [];
  } catch (e) {
    console.error('Sanity fetchEventCategories error:', e);
    return [];
  }
}

// ── Agenda Evenementen ──

export async function fetchAgendaEvents() {
  try {
    const result = await sanityClient.fetch(`*[_type == "agendaEvent" && gepubliceerd == true && startDatum >= now()] | order(featured desc, prioriteit asc, startDatum asc) {
      _id, titel, "slug": slug.current, startDatum, eindDatum, "locatie": select(locatie == "anders" => locatieAnders, locatie),
      "categorie": coalesce(categorieRef->titel, categorie),
      "categorieKleur": categorieRef->kleur,
      featured, prioriteit, doelgroep,
      beschrijving, afbeelding
    }`);
    return result || [];
  } catch (e) {
    console.error('Sanity fetchAgendaEvents error:', e);
    return [];
  }
}

export async function fetchUpcomingAgendaEvents(limit = 3) {
  try {
    const result = await sanityClient.fetch(`*[_type == "agendaEvent" && gepubliceerd == true && startDatum >= now()] | order(featured desc, prioriteit asc, startDatum asc)[0...$limit] {
      _id, titel, "slug": slug.current, startDatum, eindDatum, "locatie": select(locatie == "anders" => locatieAnders, locatie),
      "categorie": coalesce(categorieRef->titel, categorie),
      "categorieKleur": categorieRef->kleur,
      featured, prioriteit, doelgroep,
      beschrijving, afbeelding
    }`, { limit });
    return result || [];
  } catch (e) {
    console.error('Sanity fetchUpcomingAgendaEvents error:', e);
    return [];
  }
}

// ── Janazah & Overlijden ──

export async function fetchJanazahProcedure() {
  try {
    const result = await freshClient.fetch(`*[_id == "janazahProcedure"][0]{
      titel, noodnummer, introductie, stappen
    }`);
    return result || null;
  } catch (e) {
    console.error('Sanity fetchJanazahProcedure error:', e);
    return null;
  }
}

export async function fetchActiveJanazahAlert() {
  try {
    const result = await freshClient.fetch(`*[_type == "janazahAlert" && actief == true] | order(gebeddatum desc) [0]{
      _id, naamOverledene, naGebed, gebedstijdstip, gebeddatum, duaArabisch, familyConsent, actief
    }`);
    return result || null;
  } catch (e) {
    console.error('Sanity fetchActiveJanazahAlert error:', e);
    return null;
  }
}

export async function fetchAgendaEvent(slug: string) {
  try {
    const result = await sanityClient.fetch(`*[_type == "agendaEvent" && slug.current == $slug && gepubliceerd == true][0] {
      _id, titel, "slug": slug.current, startDatum, eindDatum, "locatie": select(locatie == "anders" => locatieAnders, locatie),
      "categorie": coalesce(categorieRef->titel, categorie),
      "categorieKleur": categorieRef->kleur,
      featured, doelgroep,
      beschrijving, afbeelding, onderwerpHub->{ _id, titel, "slug": slug.current },
      registrationOpen, registrationMax, registrationDeadline, externalRegistrationUrl,
      "occupancy": math::sum(*[_type == "eventRegistration" && eventRef._ref == ^._id && status != "cancelled"].partySize)
    }`, { slug });
    return result || null;
  } catch (e) {
    console.error('Sanity fetchAgendaEvent error:', e);
    return null;
  }
}

export async function fetchEventOccupancy(eventId: string): Promise<number> {
  try {
    const result = await freshClient.fetch(
      `math::sum(*[_type == "eventRegistration" && eventRef._ref == $eventId && status != "cancelled"].partySize)`,
      { eventId }
    );
    return result || 0;
  } catch (e) {
    console.error('Sanity fetchEventOccupancy error:', e);
    return 0;
  }
}
