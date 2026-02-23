import { sanityClient, urlFor } from '../../sanity/lib/client';
export { sanityClient, urlFor };

// writeClient is NOT re-exported here — import directly from
// '../../sanity/lib/client' in server-only code (src/services/, src/pages/api/)

// ── Fetch helpers (Sanity → fallback to demo) ──────────────────────

export async function fetchSettings() {
  try {
    const result = await sanityClient.fetch(`*[_id == "settings"][0]{ mosqueName, description, logo, logoFooter, favicon, theme, menuToggles, donateButtonText, volunteerTasks, address, phone, email, whatsapp, socials, iban, legal, timezone, hijriAdjustment, islamicDays, bedanktTekst }`);
    if (result) return result;
  } catch (e) {
    console.error('Sanity fetchSettings error:', e);
  }
  return demoSettings;
}

export async function fetchDiensten() {
  try {
    const result = await sanityClient.fetch(`*[_type == "service" && actief != false] | order(volgorde asc) {
      _id, titel, "slug": slug, beschrijving, inhoud, afbeelding, tijden, volgorde
    }`);
    if (result) return result;
  } catch (e) {
    console.error('Sanity fetchDiensten error:', e);
  }
  return demoDiensten;
}

export async function fetchProjecten() {
  try {
    const result = await sanityClient.fetch(`*[_type == "project" && actief == true] | order(_createdAt desc) {
      _id, titel, beschrijving, afbeelding, doelbedrag, huidigBedragCents, actief,
      citaat->{ tekst, tekstArabisch, bron }
    }`);
    if (result) return result;
  } catch (e) {
    console.error('Sanity fetchProjecten error:', e);
  }
  return demoProjecten;
}

export async function fetchNieuws() {
  try {
    const result = await sanityClient.fetch(`*[_type == "post" && gepubliceerd == true] | order(datum desc) {
      _id, titel, "slug": slug, datum, samenvatting, inhoud, afbeelding
    }`);
    if (result) return result;
    return [];
  } catch (e) {
    console.error('Sanity fetchNieuws error:', e);
  }
  return demoNieuws;
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
    if (result) return result;
  } catch (e) {
    console.error('Sanity fetchPrayerTimes error:', e);
  }
  return demoPrayerTimes;
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
    if (result) return result;
    return [];
  } catch (e) {
    console.error('Sanity fetchActueel error:', e);
  }
  return demoActueel;
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
    // Sanity verbinding gelukt → return resultaat (ook als leeg)
    if (result) return result;
  } catch (e) {
    console.error('Sanity fetchEtiquette error:', e);
  }
  // Alleen demo data als Sanity niet bereikbaar is
  return demoEtiquette;
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

// ── Demo/placeholder data ───────────────────────────────────────────

const demoPrayerTimes = {
  timezone: 'Europe/Brussels',
  coordinates: { lat: 51.05, lng: 3.73 }, // Gent
  method: 'MuslimWorldLeague',
  madhab: 'shafi',
  highLatitudeRule: 'middleOfTheNight',
  adhanOffsets: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  iqamaConfig: {
    fajr: { enabled: true, type: 'offset', minutes: 15 },
    dhuhr: { enabled: true, type: 'offset', minutes: 15 },
    asr: { enabled: true, type: 'offset', minutes: 15 },
    maghrib: { enabled: true, type: 'offset', minutes: 5 },
    isha: { enabled: true, type: 'offset', minutes: 15 },
  },
  jumuahShifts: [
    { label: 'Wintertijd', time: '13:00', note: 'Khutbah (preek) begint stipt' },
    { label: 'Zomertijd', time: '14:00', note: 'Khutbah (preek) begint stipt' },
  ],
  jumuahNote: 'Let op: De iqamah-tijden kunnen variëren. Raadpleeg het bord in de moskee voor de exacte tijden van het gezamenlijke gebed.',
  footerNote: 'De gebedstijden worden berekend op basis van uw locatie en de gekozen berekeningsmethode. Controleer bij twijfel altijd de tijden bij de moskee.',
};

const demoSettings = {
  mosqueName: 'Al-Nour Moskee',
  description: 'Een plek van aanbidding, educatie en gemeenschap. Samen bouwen we aan een sterke toekomst voor de Ummah.',
  theme: {
    baseColor: '#FBF9F7',
    primaryColor: '#1D5C6B',
    accentColor: '#593B1D',
  },
  menuToggles: {
    showServices: true,
    showProjects: true,
    showNews: true,
    showAbout: true,
    showAgenda: true,
  },
  hijriAdjustment: 0,
  islamicDays: {
    enabled: true,
    showRamadan: true,
    showEidFitr: true,
    showEidAdha: true,
    showArafah: true,
    showLailatAlQadr: true,
    showAshura: true,
    showIsraMiraj: true,
  },
  volunteerTasks: ['Koken', 'Kuisen', 'Onderhoud', 'Evenementen', 'Educatie', 'Administratie'],
  donateButtonText: 'Doneer',
  address: 'Voorbeeldstraat 1, 1000 Brussel',
  city: 'Brussels',
  country: 'Belgium',
  phone: '+32 2 123 45 67',
  email: 'info@alnour-moskee.be',
  whatsapp: '3221234567',
  socials: {
    facebook: 'https://facebook.com',
    instagram: 'https://instagram.com',
    youtube: 'https://youtube.com',
  },
  iban: 'BE00 0000 0000 0000',
  legal: {
    kvk: '0000.000.000',
  },
};

const demoDiensten = [
  {
    _id: '1',
    titel: 'Koranles',
    slug: { current: 'koranles' },
    beschrijving: 'Wekelijkse Koranlessen voor kinderen en volwassenen, gegeven door ervaren docenten in een rustige leeromgeving.',
    icoon: 'mihrab',
    tijden: 'Elke zaterdag & zondag 10:00 - 12:00',
    volgorde: 1,
  },
  {
    _id: '2',
    titel: 'Arabische Taalles',
    slug: { current: 'arabische-taalles' },
    beschrijving: 'Leer Arabisch lezen, schrijven en spreken. Cursussen voor beginners tot gevorderden.',
    icoon: 'rozet',
    tijden: 'Elke woensdag 18:00 - 20:00',
    volgorde: 2,
  },
  {
    _id: '3',
    titel: 'Islamitische Uitvaart',
    slug: { current: 'islamitische-uitvaart' },
    beschrijving: 'Begeleiding en ondersteuning bij een islamitische uitvaart volgens de soennitische tradities.',
    icoon: 'maan',
    tijden: 'Op afspraak',
    volgorde: 3,
  },
];

const demoProjecten = [
  {
    _id: '1',
    titel: 'Renovatie Gebedsruimte',
    slug: { current: 'renovatie-gebedsruimte' },
    beschrijving: 'Help ons de gebedsruimte te renoveren met nieuw tapijt, verlichting en airconditioning voor een comfortabele gebedservaring.',
    doelbedrag: 25000,
    huidigBedragCents: 1750000,
    actief: true,
  },
  {
    _id: '2',
    titel: 'Zomerkamp Jeugd 2026',
    slug: { current: 'zomerkamp-jeugd-2026' },
    beschrijving: 'Organiseer een educatief zomerkamp voor de jeugd met sportactiviteiten, workshops en islamitisch onderwijs.',
    doelbedrag: 5000,
    huidigBedragCents: 210000,
    actief: true,
  },
];


const demoActueel = [
  { _id: '1', _type: 'post', titel: 'Ramadan 2026 Programma Bekend', beschrijving: 'Het volledige Ramadan programma is nu beschikbaar. Bekijk de iftar-tijden, taraweeh-gebeden en speciale lezingen.', icoon: 'ster-4', label: 'Nieuws', href: '/nieuws/ramadan-2026-programma' },
  { _id: '2', _type: 'service', titel: 'Koranles', beschrijving: 'Wekelijkse Koranlessen voor kinderen en volwassenen, gegeven door ervaren docenten in een rustige leeromgeving.', icoon: 'mihrab', label: 'Dienst', href: '/diensten/koranles' },
  { _id: '3', _type: 'project', titel: 'Renovatie Gebedsruimte', beschrijving: 'Help ons de gebedsruimte te renoveren met nieuw tapijt, verlichting en airconditioning.', icoon: 'ruit', label: 'Project', href: '/projecten' },
];

const demoEtiquette = [
  { _id: '1', title: 'Kom op tijd', description: 'Probeer minimaal 15 minuten voor de Iqamah aanwezig te zijn.', icon: 'ster-8', volgorde: 1 },
  { _id: '2', title: 'Telefoon op stil', description: 'Zet uw telefoon op stil of vliegtuigmodus tijdens het gebed.', icon: 'ster-4', volgorde: 2 },
  { _id: '3', title: 'Schoenen uit', description: 'Plaats uw schoenen netjes in het rek bij de ingang.', icon: 'hexagon', volgorde: 3 },
  { _id: '4', title: 'Stilte in de gebedsruimte', description: 'Respecteer de rust en vermijd luide gesprekken in de gebedsruimte.', icon: 'cirkels', volgorde: 4 },
  { _id: '5', title: 'Netheid', description: 'Help mee de moskee schoon te houden. Ruim afval op en houd de wudhu-ruimte droog.', icon: 'rozet', volgorde: 5 },
  { _id: '6', title: 'Parkeren', description: 'Parkeer alleen op de aangewezen plaatsen en blokkeer geen buren.', icon: 'ruit', volgorde: 6 },
];

// ── Nieuwe fetch helpers (page singletons) ───────────────────────

export async function fetchHomePage() {
  try {
    const result = await sanityClient.fetch(`*[_id == "homePage"][0]{
      heroTagline, heroTitle, heroSubtitle, heroCta, heroImage, toonActueel, badges, badgeKleur, seoTitle, seoDescription
    }`);
    if (result) return result;
  } catch (e) {
    console.error('Sanity fetchHomePage error:', e);
  }
  return demoHomePage;
}

export async function fetchAboutPage() {
  try {
    const result = await sanityClient.fetch(`*[_id == "aboutPage"][0]{
      missieTitle, missieText, missieImage, waarden, team, seoTitle, seoDescription
    }`);
    if (result) return result;
  } catch (e) {
    console.error('Sanity fetchAboutPage error:', e);
  }
  return demoAboutPage;
}

export async function fetchContactPage() {
  try {
    const result = await sanityClient.fetch(`*[_id == "contactPage"][0]{
      introText, openingstijden, onderwerpen, seoTitle, seoDescription
    }`);
    if (result) return result;
  } catch (e) {
    console.error('Sanity fetchContactPage error:', e);
  }
  return demoContactPage;
}

const demoHomePage = {
  heroTitle: 'Welkom bij',
  heroSubtitle: null,
  heroCta: 'Gebedstijden bekijken',
  heroImage: null,
  toonActueel: true,
  badges: ['Allen Welkom', 'Të gjithë të mirëpritur', 'All Welcome', 'الجميع مرحب به'],
};

export const demoAboutPage = {
  missieTitle: 'Onze Missie',
  missieText: null,
  missieImage: null,
  waarden: [
    { title: 'Gebed & Spiritualiteit', description: "Vijf dagelijkse gebeden, Jumu'ah en speciale gebedsdiensten het hele jaar door.", icon: 'maan' },
    { title: 'Kennis & Onderwijs', description: 'Koranlessen, Arabische taalcursussen en islamitische lezingen voor alle leeftijden.', icon: 'rozet' },
    { title: 'Gemeenschap & Solidariteit', description: 'Samen bouwen aan een sterke, verbonden gemeenschap die er voor elkaar is.', icon: 'tasbih' },
  ],
  team: [],
};

export const demoContactPage = {
  introText: 'Heeft u een vraag of wilt u meer informatie? Neem gerust contact met ons op.',
  openingstijden: [
    { dagen: 'Maandag - Vrijdag', tijden: '08:00 - 21:00', opmerking: '' },
    { dagen: 'Zaterdag - Zondag', tijden: '09:00 - 21:00', opmerking: '' },
    { dagen: "Jumu'ah (Vrijdag)", tijden: '12:30 & 14:00', opmerking: '' },
  ],
  onderwerpen: ['Algemene vraag', 'Lessen & cursussen', 'Donatie', 'Uitvaart', 'Anders'],
};

// ── Agenda Evenementen ──

export async function fetchAgendaEvents() {
  try {
    const result = await sanityClient.fetch(`*[_type == "agendaEvent" && gepubliceerd == true && startDatum >= now()] | order(startDatum asc) {
      _id, titel, slug, startDatum, eindDatum, locatie, categorie, beschrijving,
      "afbeelding": afbeelding.asset->url
    }`);
    if (result) return result;
    return [];
  } catch (e) {
    console.error('Sanity fetchAgendaEvents error:', e);
  }
  return [];
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


const demoNieuws = [
  {
    _id: '1',
    titel: 'Ramadan 2026 Programma Bekend',
    slug: { current: 'ramadan-2026-programma' },
    datum: '2026-02-15T10:00:00Z',
    samenvatting: 'Het volledige Ramadan programma is nu beschikbaar. Bekijk de iftar-tijden, taraweeh-gebeden en speciale lezingen.',
    gepubliceerd: true,
  },
  {
    _id: '2',
    titel: 'Nieuwe Koranles Seizoen Start',
    slug: { current: 'nieuwe-koranles-seizoen' },
    datum: '2026-01-20T10:00:00Z',
    samenvatting: 'Het nieuwe seizoen Koranlessen begint in februari. Schrijf nu in voor kinderen (6-12 jaar) en volwassenen.',
    gepubliceerd: true,
  },
];
