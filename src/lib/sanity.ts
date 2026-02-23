import { sanityClient, urlFor } from '../../sanity/lib/client';
export { sanityClient, urlFor };

// writeClient is NOT re-exported here — import directly from
// '../../sanity/lib/client' in server-only code (src/services/, src/pages/api/)

// ── Fetch helpers (Sanity CMS is enige bron) ──────────────────────

export async function fetchSettings() {
  try {
    const result = await sanityClient.fetch(`*[_id == "settings"][0]{ mosqueName, description, logo, logoFooter, favicon, theme, menuToggles, donateButtonText, volunteerTasks, address, phone, email, whatsapp, socials, iban, legal, timezone, hijriAdjustment, islamicDays, bedanktTekst }`);
    return result || null;
  } catch (e) {
    console.error('Sanity fetchSettings error:', e);
    return null;
  }
}

export async function fetchDiensten() {
  try {
    const result = await sanityClient.fetch(`*[_type == "service" && actief != false] | order(volgorde asc) {
      _id, titel, "slug": slug, beschrijving, inhoud, afbeelding, tijden, volgorde
    }`);
    return result || [];
  } catch (e) {
    console.error('Sanity fetchDiensten error:', e);
    return [];
  }
}

export async function fetchProjecten() {
  try {
    const result = await sanityClient.fetch(`*[_type == "project" && actief == true] | order(_createdAt desc) {
      _id, titel, beschrijving, afbeelding, doelbedrag, huidigBedragCents, actief,
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
    const result = await sanityClient.fetch(`*[_type == "post" && gepubliceerd == true] | order(datum desc) {
      _id, titel, "slug": slug, datum, samenvatting, inhoud, afbeelding
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
      (_type == "post" && gepubliceerd == true) ||
      (_type == "service" && actief != false) ||
      (_type == "project" && actief == true)
    ] | order(_createdAt desc) [0...3] {
      _id,
      _type,
      _createdAt,
      "titel": select(
        _type == "post" => titel,
        _type == "service" => titel,
        _type == "project" => titel
      ),
      "slug": select(
        _type == "post" => slug.current,
        _type == "service" => slug.current,
        _type == "project" => slug.current
      ),
      "beschrijving": select(
        _type == "post" => samenvatting,
        _type == "service" => beschrijving,
        _type == "project" => beschrijving
      ),
      "icoon": select(
        _type == "post" => "ster-4",
        _type == "service" => icoon,
        _type == "project" => "ruit"
      ),
      "label": select(
        _type == "post" => "Nieuws",
        _type == "service" => "Dienst",
        _type == "project" => "Project"
      ),
      "href": select(
        _type == "post" => "/nieuws/" + slug.current,
        _type == "service" => "/diensten/" + slug.current,
        _type == "project" => "/projecten"
      )
    }`);
    return result || [];
  } catch (e) {
    console.error('Sanity fetchActueel error:', e);
    return [];
  }
}

export async function fetchAllQuotes(categorie: string = 'donaties') {
  try {
    const result = await sanityClient.fetch(`*[_type == "quote" && actief == true && categorie == $categorie] {
      _id, tekst, tekstArabisch, bron
    }`, { categorie });
    return result || [];
  } catch (e) {
    console.error('Sanity fetchAllQuotes error:', e);
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
    const result = await sanityClient.fetch(`*[_type == "etiquette" && gepubliceerd != false] | order(volgorde asc) {
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
    return await sanityClient.fetch(
      `*[_type == "project" && titel == $titel][0]{ _id }`,
      { titel }
    );
  } catch (e) {
    console.error('Sanity fetchProjectByTitle error:', e);
    return null;
  }
}

// ── Nieuwe fetch helpers (page singletons) ───────────────────────

export async function fetchHomePage() {
  try {
    const result = await sanityClient.fetch(`*[_id == "homePage"][0]{
      heroTagline, heroTitle, heroSubtitle, heroCta, heroImage, toonActueel, badges, badgeKleur, seoTitle, seoDescription
    }`);
    return result || null;
  } catch (e) {
    console.error('Sanity fetchHomePage error:', e);
    return null;
  }
}

export async function fetchAboutPage() {
  try {
    const result = await sanityClient.fetch(`*[_id == "aboutPage"][0]{
      missieTitle, missieText, missieImage, waarden, team, seoTitle, seoDescription
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
      introText, openingstijden, onderwerpen, seoTitle, seoDescription
    }`);
    return result || null;
  } catch (e) {
    console.error('Sanity fetchContactPage error:', e);
    return null;
  }
}

// ── Agenda Evenementen ──

export async function fetchAgendaEvents() {
  try {
    const result = await sanityClient.fetch(`*[_type == "agendaEvent" && gepubliceerd == true && startDatum >= now()] | order(startDatum asc) {
      _id, titel, slug, startDatum, eindDatum, locatie, categorie, beschrijving,
      "afbeelding": afbeelding.asset->url
    }`);
    return result || [];
  } catch (e) {
    console.error('Sanity fetchAgendaEvents error:', e);
    return [];
  }
}

export async function fetchUpcomingAgendaEvents(limit = 3) {
  try {
    const result = await sanityClient.fetch(`*[_type == "agendaEvent" && gepubliceerd == true && startDatum >= now()] | order(startDatum asc)[0...$limit] {
      _id, titel, slug, startDatum, eindDatum, locatie, categorie, beschrijving,
      "afbeelding": afbeelding.asset->url
    }`, { limit });
    return result || [];
  } catch (e) {
    console.error('Sanity fetchUpcomingAgendaEvents error:', e);
    return [];
  }
}

export async function fetchAgendaEvent(slug: string) {
  try {
    const result = await sanityClient.fetch(`*[_type == "agendaEvent" && slug.current == $slug && gepubliceerd == true][0] {
      _id, titel, slug, startDatum, eindDatum, locatie, categorie, beschrijving,
      "afbeelding": afbeelding.asset->url
    }`, { slug });
    return result || null;
  } catch (e) {
    console.error('Sanity fetchAgendaEvent error:', e);
    return null;
  }
}
