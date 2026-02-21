import { sanityClient, urlFor, writeClient } from '../../sanity/lib/client';
export { sanityClient, urlFor, writeClient };

// ── Fetch helpers (Sanity → fallback to demo) ──────────────────────

export async function fetchSettings() {
  try {
    const result = await sanityClient.fetch(`*[_id == "settings"][0]`);
    if (result) return result;
  } catch (e) {
    console.error('Sanity fetchSettings error:', e);
  }
  return demoSettings;
}

export async function fetchDiensten() {
  try {
    const result = await sanityClient.fetch(`*[_type == "service"] | order(volgorde asc) {
      _id, titel, "slug": slug, beschrijving, inhoud, icoon, afbeelding, tijden, volgorde
    }`);
    if (result && result.length > 0) return result;
  } catch (e) {
    console.error('Sanity fetchDiensten error:', e);
  }
  return demoDiensten;
}

export async function fetchProjecten() {
  try {
    const result = await sanityClient.fetch(`*[_type == "project" && actief == true] | order(_createdAt desc) {
      _id, titel, beschrijving, afbeelding, doelbedrag, huidigBedrag, actief,
      citaat->{ tekst, tekstArabisch, bron }
    }`);
    if (result && result.length > 0) return result;
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
    if (result && result.length > 0) return result;
  } catch (e) {
    console.error('Sanity fetchNieuws error:', e);
  }
  return demoNieuws;
}

export async function fetchPrayerTimes() {
  try {
    const result = await sanityClient.fetch(`*[_id == "prayerTimes"][0]{
      mawaqitSlug, jumuahShifts, jumuahNote, footerNote
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
      (_type == "service") ||
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
    if (result && result.length > 0) return result;
  } catch (e) {
    console.error('Sanity fetchActueel error:', e);
  }
  return demoActueel;
}

export async function fetchQuote(categorie: string = 'donaties') {
  try {
    const result = await sanityClient.fetch(`*[_type == "quote" && actief == true && categorie == $categorie] {
      _id, tekst, tekstArabisch, bron
    }`, { categorie });
    if (result && result.length > 0) {
      // Kies willekeurig een citaat
      return result[Math.floor(Math.random() * result.length)];
    }
  } catch (e) {
    console.error('Sanity fetchQuote error:', e);
  }
  // Fallback: willekeurig demo citaat uit de juiste categorie
  const filtered = demoQuotes.filter(q => q.categorie === categorie);
  return filtered[Math.floor(Math.random() * filtered.length)] || demoQuotes[0];
}

export async function fetchEtiquette() {
  try {
    const result = await sanityClient.fetch(`*[_type == "etiquette"] | order(volgorde asc) {
      _id, title, description, icon, volgorde
    }`);
    if (result && result.length > 0) return result;
  } catch (e) {
    console.error('Sanity fetchEtiquette error:', e);
  }
  return demoEtiquette;
}

// ── Demo/placeholder data ───────────────────────────────────────────

const demoPrayerTimes = {
  mawaqitSlug: 'moskeeelalbani',
  jumuahShifts: [
    { label: 'Wintertijd', time: '13:00', note: 'Khutbah (preek) begint stipt' },
    { label: 'Zomertijd', time: '14:00', note: 'Khutbah (preek) begint stipt' },
  ],
  jumuahNote: 'Let op: De iqamah-tijden kunnen variëren. Raadpleeg het bord in de moskee voor de exacte tijden van het gezamenlijke gebed. Zorg dat u op tijd aanwezig bent voor de khutbah.',
  footerNote: 'De dagelijkse gebedstijden worden automatisch bijgewerkt via Mawaqit. Controleer bij twijfel altijd de tijden bij de moskee.',
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
    huidigBedrag: 17500,
    actief: true,
  },
  {
    _id: '2',
    titel: 'Zomerkamp Jeugd 2026',
    slug: { current: 'zomerkamp-jeugd-2026' },
    beschrijving: 'Organiseer een educatief zomerkamp voor de jeugd met sportactiviteiten, workshops en islamitisch onderwijs.',
    doelbedrag: 5000,
    huidigBedrag: 2100,
    actief: true,
  },
];

const demoQuotes = [
  {
    _id: 'q1',
    tekst: 'Het voorbeeld van degenen die hun rijkdom uitgeven op de weg van Allah is als een graankorrel die zeven aren voortbrengt, in elke aar honderd graankorrels.',
    tekstArabisch: 'مَّثَلُ ٱلَّذِينَ يُنفِقُونَ أَمْوَٰلَهُمْ فِى سَبِيلِ ٱللَّهِ كَمَثَلِ حَبَّةٍ أَنۢبَتَتْ سَبْعَ سَنَابِلَ فِى كُلِّ سُنۢبُلَةٍۢ مِّا۟ئَةُ حَبَّةٍۢ',
    bron: 'Quran 2:261',
    categorie: 'donaties',
  },
  {
    _id: 'q2',
    tekst: 'Sadaqah dooft de zonde uit zoals water het vuur dooft.',
    tekstArabisch: 'وَالصَّدَقَةُ تُطْفِئُ الْخَطِيئَةَ كَمَا يُطْفِئُ الْمَاءُ النَّارَ',
    bron: 'Sunan at-Tirmidhi 2616',
    categorie: 'donaties',
  },
  {
    _id: 'q3',
    tekst: 'Wie een moskee bouwt voor Allah, Allah zal voor hem een huis bouwen in het Paradijs.',
    tekstArabisch: 'مَنْ بَنَى مَسْجِدًا لِلَّهِ بَنَى اللَّهُ لَهُ مِثْلَهُ فِي الْجَنَّةِ',
    bron: 'Sahih al-Bukhari 450',
    categorie: 'donaties',
  },
  {
    _id: 'q4',
    tekst: 'Bescherm jezelf tegen het Hellevuur, al is het met een halve dadel.',
    tekstArabisch: 'اتَّقُوا النَّارَ وَلَوْ بِشِقِّ تَمْرَةٍ',
    bron: 'Sahih al-Bukhari 1417',
    categorie: 'donaties',
  },
  {
    _id: 'q5',
    tekst: 'De rijkdom van een persoon wordt niet verminderd door Sadaqah.',
    tekstArabisch: 'مَا نَقَصَتْ صَدَقَةٌ مِنْ مَالٍ',
    bron: 'Sahih Muslim 2588',
    categorie: 'donaties',
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
      heroTitle, heroSubtitle, heroCta, heroImage, toonActueel, badges
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
      missieTitle, missieText, missieImage, waarden, team
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
      introText, openingstijden, onderwerpen
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
    if (result && result.length > 0) return result;
  } catch (e) {
    console.error('Sanity fetchAgendaEvents error:', e);
  }
  return demoAgendaEvents;
}

export async function fetchUpcomingAgendaEvents(limit = 3) {
  try {
    const result = await sanityClient.fetch(`*[_type == "agendaEvent" && gepubliceerd == true && startDatum >= now()] | order(startDatum asc)[0...$limit] {
      _id, titel, slug, startDatum, eindDatum, locatie, categorie, beschrijving,
      "afbeelding": afbeelding.asset->url
    }`, { limit });
    if (result && result.length > 0) return result;
  } catch (e) {
    console.error('Sanity fetchUpcomingAgendaEvents error:', e);
  }
  return demoAgendaEvents.slice(0, limit);
}

export async function fetchAgendaEvent(slug: string) {
  try {
    const result = await sanityClient.fetch(`*[_type == "agendaEvent" && slug.current == $slug && gepubliceerd == true][0] {
      _id, titel, slug, startDatum, eindDatum, locatie, categorie, beschrijving,
      "afbeelding": afbeelding.asset->url
    }`, { slug });
    if (result) return result;
  } catch (e) {
    console.error('Sanity fetchAgendaEvent error:', e);
  }
  return demoAgendaEvents.find(e => e.slug.current === slug) || null;
}

// Volgende vrijdag helper
function nextDay(dayOfWeek: number, weeksAhead = 0): string {
  const d = new Date();
  const diff = ((dayOfWeek - d.getDay()) + 7) % 7 || 7;
  d.setDate(d.getDate() + diff + (weeksAhead * 7));
  d.setHours(13, 0, 0, 0);
  return d.toISOString();
}

const demoAgendaEvents = [
  {
    _id: 'demo-1',
    titel: 'Vrijdaggebed & Khutbah',
    slug: { current: 'vrijdaggebed' },
    startDatum: nextDay(5),
    eindDatum: null,
    locatie: 'Gebedsruimte',
    categorie: 'Gebed',
    beschrijving: 'Wekelijks vrijdaggebed met khutbah (preek). Kom op tijd en parkeer correct.',
    afbeelding: null,
  },
  {
    _id: 'demo-2',
    titel: 'Arabische Les',
    slug: { current: 'arabische-les' },
    startDatum: nextDay(6),
    eindDatum: null,
    locatie: 'Leslokaal',
    categorie: 'Les',
    beschrijving: 'Wekelijkse Arabische les voor beginners en gevorderden.',
    afbeelding: null,
  },
  {
    _id: 'demo-3',
    titel: 'Gemeenschapsbijeenkomst',
    slug: { current: 'gemeenschapsbijeenkomst' },
    startDatum: nextDay(0, 2),
    eindDatum: null,
    locatie: 'Grote zaal',
    categorie: 'Bijeenkomst',
    beschrijving: 'Maandelijkse bijeenkomst voor de hele gemeenschap met thee en koekjes.',
    afbeelding: null,
  },
];

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
