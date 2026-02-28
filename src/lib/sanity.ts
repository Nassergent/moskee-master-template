import { sanityClient, freshClient, urlFor } from '../../sanity/lib/client';
import { formatLog } from './logic/logger';
import type { Settings, Project, Service, AgendaEvent, NewsPost, Quote, LessonProgram, EventCategory, Etiquette } from '../types/sanity';
export { sanityClient, freshClient, urlFor };

// writeClient is NOT re-exported here — import directly from
// '../../sanity/lib/client' in server-only code (src/services/, src/pages/api/)

// ── Generic fetch wrapper ─────────────────────────────────────────

async function safeFetch<T>(
  client: typeof sanityClient | typeof freshClient,
  query: string,
  params?: Record<string, unknown>,
  options?: { fallback?: T; label?: string }
): Promise<T> {
  try {
    const result = await client.fetch<T>(query, params);
    return result ?? (options?.fallback as T);
  } catch (e) {
    console.error(formatLog('error', 'sanity_fetch_error', { label: options?.label }, e));
    return options?.fallback as T;
  }
}

// ── Fetch helpers (Sanity CMS is enige bron) ──────────────────────

export async function fetchSettings(): Promise<Settings | null> {
  // freshClient: theme/menu wijzigingen moeten direct zichtbaar zijn, geen CDN cache
  return safeFetch(freshClient, `*[_id == "settings"][0]{ mosqueName, description, logo, logoFooter, favicon, primaryTheme, menuToggles, donateButtonText, volunteerTasks, address, phone, email, whatsapp, socials, iban, legal, timezone, hijriAdjustment, islamicDays, bedanktTekst, payconiqQr }`, undefined, { fallback: null, label: 'fetchSettings' });
}

export async function fetchDiensten(): Promise<Service[]> {
  return safeFetch(sanityClient, `*[_type == "service" && actief == true] | order(volgorde asc) {
    _id, titel, "slug": slug.current, beschrijving, inhoud, afbeelding, tijden, volgorde
  }`, undefined, { fallback: [] as any[], label: 'fetchDiensten' });
}

export async function fetchProjecten(): Promise<Project[]> {
  // freshClient: donatiebedragen moeten real-time zijn, geen CDN cache
  return safeFetch(freshClient, `*[_type == "project" && actief == true] | order(toonOpHomepage desc, _createdAt desc) [0...2] {
    _id, titel, beschrijving, afbeelding, doelbedrag, huidigBedragCents, actief,
    prijsPerEenheid, eenheid, toonOpHomepage,
    citaat->{ tekst, tekstArabisch, bron }
  }`, undefined, { fallback: [] as any[], label: 'fetchProjecten' });
}

export async function fetchNieuws(): Promise<NewsPost[]> {
  return safeFetch(sanityClient, `*[_type == "post" && gepubliceerd == true && !defined(onderwerpHub)] | order(datum desc) {
    _id, titel, "slug": slug.current, datum, samenvatting, inhoud, afbeelding, postType
  }`, undefined, { fallback: [] as any[], label: 'fetchNieuws' });
}

export async function fetchPrayerTimes() {
  return safeFetch(sanityClient, `*[_id == "prayerTimes"][0]{
    timezone, coordinates, method, madhab, highLatitudeRule,
    adhanOffsets, iqamaConfig, jumuahShifts, jumuahNote, footerNote
  }`, undefined, { fallback: null, label: 'fetchPrayerTimes' });
}


export async function fetchQuote(categorie: string = 'donaties'): Promise<Quote | null> {
  try {
    const result = await sanityClient.fetch(`*[_type == "quote" && actief == true && categorie == $categorie] {
      _id, tekst, tekstArabisch, bron
    }`, { categorie });
    if (result && result.length > 0) {
      return result[Math.floor(Math.random() * result.length)];
    }
    return null;
  } catch (e) {
    console.error(formatLog('error', 'sanity_fetch_error', { label: 'fetchQuote' }, e));
    return null;
  }
}

export async function fetchEtiquette(): Promise<Etiquette[]> {
  return safeFetch(sanityClient, `*[_type == "etiquette" && gepubliceerd == true] | order(volgorde asc) {
    _id, titel, beschrijving, volgorde
  }`, undefined, { fallback: [] as any[], label: 'fetchEtiquette' });
}

// ── Centralized query helpers (used by services + API routes) ────────

export async function fetchProjectByTitle(titel: string) {
  // freshClient: webhook moet actuele _id ophalen
  return safeFetch(freshClient, `*[_type == "project" && titel == $titel][0]{ _id }`, { titel }, { fallback: null, label: 'fetchProjectByTitle' });
}

export async function fetchProjectById(id: string) {
  return safeFetch(freshClient, `*[_type == "project" && _id == $id][0]{ _id, titel, huidigBedragCents }`, { id }, { fallback: null, label: 'fetchProjectById' });
}

export async function fetchAllActiveProjectTotals() {
  return safeFetch(freshClient, `*[_type == "project" && actief == true]{ _id, titel, huidigBedragCents }`, undefined, { fallback: [] as any[], label: 'fetchAllActiveProjectTotals' });
}

// ── Nieuwe fetch helpers (page singletons) ───────────────────────

export async function fetchHomePage() {
  return safeFetch(sanityClient, `*[_id == "homePage"][0]{
    heroTagline, heroTitle, heroSubtitle, heroCta, heroImage, toonActueel, badges, badgeKleur
  }`, undefined, { fallback: null, label: 'fetchHomePage' });
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
  return safeFetch(freshClient, `*[_id == "homeCards"][0]{
    ingeschakeld,
    card1 ${CARD_PROJECTION},
    card2 ${CARD_PROJECTION},
    card3 ${CARD_PROJECTION}
  }`, undefined, { fallback: null, label: 'fetchHomeCards' });
}

export async function fetchAboutPage() {
  return safeFetch(sanityClient, `*[_id == "aboutPage"][0]{
    heroTitle, heroSubtitle,
    missieTitle, missieText, missieImage,
    kengetallenTonen, kengetallen,
    geschiedenisTonen, geschiedenisTitle, tijdlijn,
    waardenTonen, waardenTitle, waarden,
    teamTonen, teamTitle, team,
    vrijwilligerTonen, vrijwilligerTitle, vrijwilligerText
  }`, undefined, { fallback: null, label: 'fetchAboutPage' });
}

export async function fetchContactPage() {
  return safeFetch(sanityClient, `*[_id == "contactPage"][0]{
    introText, openingstijden, onderwerpen
  }`, undefined, { fallback: null, label: 'fetchContactPage' });
}

// ── Topic Hub (Nieuws ↔ Agenda koppeling) ──

export async function fetchPost(slug: string) {
  return safeFetch(sanityClient, `*[_type == "post" && slug.current == $slug && gepubliceerd == true][0]{
    _id, titel, "slug": slug.current, datum, samenvatting, inhoud, afbeelding, postType,
    onderwerpHub->{ _id, titel, "slug": slug.current }
  }`, { slug }, { fallback: null, label: 'fetchPost' });
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
    console.error(formatLog('error', 'sanity_fetch_error', { label: 'fetchTopicHubRelated' }, e));
    return { posts: [], events: [] };
  }
}

// ── Lessen & Ramadan ──

export async function fetchLessonPrograms(): Promise<LessonProgram[]> {
  return safeFetch(sanityClient, `*[_type == "lessonProgram" && actief == true] | order(volgorde asc) {
    _id, titel, categorie, beschrijving, inhoud, afbeelding,
    maxCapaciteit, inschrijvingOpen, vrijwilligersLink, rooster, volgorde
  }`, undefined, { fallback: [] as any[], label: 'fetchLessonPrograms' });
}

export async function fetchRamadanOverride() {
  return safeFetch(sanityClient, `*[_id == "ramadanOverride"][0]{
    ingeschakeld, omschrijving, rooster
  }`, undefined, { fallback: null, label: 'fetchRamadanOverride' });
}

// ── Event Categorieën ──

export async function fetchEventCategories(): Promise<EventCategory[]> {
  return safeFetch(sanityClient, `*[_type == "eventCategorie"] | order(volgorde asc) {
    _id, titel, "slug": slug.current, kleur, icoon, volgorde
  }`, undefined, { fallback: [] as any[], label: 'fetchEventCategories' });
}

// ── Agenda Evenementen ──

export async function fetchAgendaEvents(): Promise<AgendaEvent[]> {
  return safeFetch(sanityClient, `*[_type == "agendaEvent" && gepubliceerd == true && coalesce(eindDatum, startDatum) >= now()] | order(featured desc, prioriteit asc, startDatum asc) {
    _id, titel, "slug": slug.current, startDatum, eindDatum, "locatie": select(locatie == "anders" => locatieAnders, locatie),
    "categorie": coalesce(categorieRef->titel, categorie),
    "categorieKleur": categorieRef->kleur,
    featured, prioriteit, doelgroep,
    beschrijving, afbeelding
  }`, undefined, { fallback: [] as any[], label: 'fetchAgendaEvents' });
}

export async function fetchUpcomingAgendaEvents(limit = 3): Promise<AgendaEvent[]> {
  return safeFetch(sanityClient, `*[_type == "agendaEvent" && gepubliceerd == true && coalesce(eindDatum, startDatum) >= now()] | order(featured desc, prioriteit asc, startDatum asc)[0...$limit] {
    _id, titel, "slug": slug.current, startDatum, eindDatum, "locatie": select(locatie == "anders" => locatieAnders, locatie),
    "categorie": coalesce(categorieRef->titel, categorie),
    "categorieKleur": categorieRef->kleur,
    featured, prioriteit, doelgroep,
    beschrijving, afbeelding
  }`, { limit }, { fallback: [] as any[], label: 'fetchUpcomingAgendaEvents' });
}

// ── Janazah & Overlijden ──

export async function fetchJanazahProcedure() {
  return safeFetch(freshClient, `*[_id == "janazahProcedure"][0]{
    titel, noodnummer, introductie, stappen
  }`, undefined, { fallback: null, label: 'fetchJanazahProcedure' });
}

export async function fetchActiveJanazahAlert() {
  return safeFetch(freshClient, `*[_type == "janazahAlert" && actief == true] | order(gebeddatum desc) [0]{
    _id, naamOverledene, naGebed, gebedstijdstip, gebeddatum, duaArabisch, familyConsent, actief
  }`, undefined, { fallback: null, label: 'fetchActiveJanazahAlert' });
}

export async function fetchAgendaEvent(slug: string) {
  return safeFetch(sanityClient, `*[_type == "agendaEvent" && slug.current == $slug && gepubliceerd == true][0] {
    _id, titel, "slug": slug.current, startDatum, eindDatum, "locatie": select(locatie == "anders" => locatieAnders, locatie),
    "categorie": coalesce(categorieRef->titel, categorie),
    "categorieKleur": categorieRef->kleur,
    featured, doelgroep,
    beschrijving, afbeelding, onderwerpHub->{ _id, titel, "slug": slug.current },
    registrationOpen, registrationMax, registrationDeadline, externalRegistrationUrl,
    "occupancy": math::sum(*[_type == "eventRegistration" && eventRef._ref == ^._id && status != "cancelled"].partySize)
  }`, { slug }, { fallback: null, label: 'fetchAgendaEvent' });
}

export async function fetchAgendaEventRegistrationInfo(eventId: string) {
  return safeFetch(freshClient, `*[_type == "agendaEvent" && _id == $eventId][0]{ _id, titel, registrationOpen, registrationMax, registrationDeadline }`, { eventId }, { fallback: null, label: 'fetchAgendaEventRegistrationInfo' });
}

export async function fetchEventOccupancy(eventId: string): Promise<number> {
  return safeFetch(freshClient, `math::sum(*[_type == "eventRegistration" && eventRef._ref == $eventId && status != "cancelled"].partySize)`, { eventId }, { fallback: 0, label: 'fetchEventOccupancy' });
}

// ── Homepage Batched Queries (2.2c — reduces ~7 calls to ~3) ──

export async function fetchHomepageCdnBatch() {
  return safeFetch(sanityClient, `{
    "homePage": *[_id == "homePage"][0]{
      heroTagline, heroTitle, heroSubtitle, heroCta, heroImage, toonActueel, badges, badgeKleur
    },
    "actueel": *[_type == "post" && gepubliceerd == true && !defined(onderwerpHub)] | order(_createdAt desc) [0...3] {
      _id, _type, _createdAt,
      "titel": titel, "slug": slug.current,
      "beschrijving": samenvatting, "href": "/nieuws/" + slug.current,
      postType
    },
    "etiquette": *[_type == "etiquette" && gepubliceerd == true] | order(volgorde asc) {
      _id, titel, beschrijving, volgorde
    }
  }`, undefined, { fallback: { homePage: null, actueel: [], etiquette: [] }, label: 'fetchHomepageCdnBatch' });
}

export async function fetchHomepageFreshBatch() {
  return safeFetch(freshClient, `{
    "settings": *[_id == "settings"][0]{ mosqueName, description, logo, logoFooter, favicon, primaryTheme, menuToggles, donateButtonText, volunteerTasks, address, phone, email, whatsapp, socials, iban, legal, timezone, hijriAdjustment, islamicDays, bedanktTekst, payconiqQr },
    "homeCards": *[_id == "homeCards"][0]{
      ingeschakeld,
      card1 ${CARD_PROJECTION},
      card2 ${CARD_PROJECTION},
      card3 ${CARD_PROJECTION}
    },
    "projecten": *[_type == "project" && actief == true] | order(toonOpHomepage desc, _createdAt desc) [0...2] {
      _id, titel, beschrijving, afbeelding, doelbedrag, huidigBedragCents, actief,
      prijsPerEenheid, eenheid, toonOpHomepage,
      citaat->{ tekst, tekstArabisch, bron }
    }
  }`, undefined, { fallback: { settings: null, homeCards: null, projecten: [] }, label: 'fetchHomepageFreshBatch' });
}
