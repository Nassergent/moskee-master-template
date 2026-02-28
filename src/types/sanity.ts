/**
 * Core Sanity CMS type definitions.
 * Manually derived from sanity/schemas/ — single source of truth for TypeScript.
 */

// ── Sanity primitives ──

export interface SanityImage {
  _type: 'image';
  asset: { _ref: string; _type: 'reference' };
  hotspot?: { x: number; y: number; height: number; width: number };
  crop?: { top: number; bottom: number; left: number; right: number };
}

export interface SanitySlug {
  _type: 'slug';
  current: string;
}

export interface SanityReference {
  _ref: string;
  _type: 'reference';
}

export type PortableTextBlock = {
  _type: 'block' | 'image';
  [key: string]: unknown;
};

// ── Settings (singleton) ──

export type PrimaryTheme = 'slate-indigo' | 'warm-umber' | 'deep-bordeaux' | 'charcoal-sage';

export interface MenuToggles {
  showServices?: boolean;
  showLessen?: boolean;
  showProjects?: boolean;
  showAbout?: boolean;
  showMollie?: boolean;
  showDonaties?: boolean;
  showAgenda?: boolean;
  showJanazah?: boolean;
  showGebedstijden?: boolean;
  showVrijwilligers?: boolean;
  showNieuws?: boolean;
}

export interface IslamicDays {
  enabled?: boolean;
  showRamadan?: boolean;
  showEidFitr?: boolean;
  showEidAdha?: boolean;
  showArafah?: boolean;
  showLailatAlQadr?: boolean;
  showAshura?: boolean;
  showIsraMiraj?: boolean;
}

export interface Settings {
  mosqueName: string;
  description?: string;
  logo?: SanityImage;
  logoFooter?: SanityImage;
  favicon?: SanityImage;
  primaryTheme?: PrimaryTheme;
  menuToggles?: MenuToggles;
  donateButtonText?: string;
  volunteerTasks?: string[];
  address?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  socials?: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
  };
  iban?: string;
  legal?: { kvk?: string };
  timezone?: string;
  hijriAdjustment?: number;
  islamicDays?: IslamicDays;
  bedanktTekst?: string;
  payconiqQr?: SanityImage;
}

// ── Project (Goede Doelen) ──

export interface Quote {
  _id: string;
  tekst: string;
  tekstArabisch?: string;
  bron: string;
  categorie?: 'donaties' | 'gemeenschap' | 'gebed' | 'kennis' | 'algemeen';
  actief?: boolean;
}

export interface Project {
  _id: string;
  titel: string;
  beschrijving?: string;
  afbeelding?: SanityImage;
  doelbedrag?: number;
  huidigBedragCents?: number;
  prijsPerEenheid?: number;
  eenheid?: string;
  toonOpHomepage?: boolean;
  actief: boolean;
  citaat?: Pick<Quote, 'tekst' | 'tekstArabisch' | 'bron'>;
}

// ── Service (Diensten) ──

export interface Service {
  _id: string;
  titel: string;
  slug: string; // resolved from slug.current in GROQ
  beschrijving?: string;
  inhoud?: PortableTextBlock[];
  afbeelding?: SanityImage;
  tijden?: string;
  volgorde?: number;
}

// ── AgendaEvent ──

export interface AgendaEvent {
  _id: string;
  titel: string;
  slug: string;
  startDatum: string;
  eindDatum?: string;
  locatie?: string;
  categorie?: string; // resolved via GROQ coalesce
  categorieKleur?: string;
  featured?: boolean;
  prioriteit?: number;
  doelgroep?: string;
  beschrijving?: PortableTextBlock[];
  afbeelding?: SanityImage;
  registrationOpen?: boolean;
  registrationMax?: number;
  registrationDeadline?: string;
  externalRegistrationUrl?: string;
  occupancy?: number;
}

// ── NewsPost ──

export type PostType = 'nieuws' | 'mededeling' | 'artikel';

export interface NewsPost {
  _id: string;
  titel: string;
  slug: string;
  datum?: string;
  samenvatting?: string;
  inhoud?: PortableTextBlock[];
  afbeelding?: SanityImage;
  postType?: PostType;
  gepubliceerd?: boolean;
  onderwerpHub?: { _id: string; titel: string; slug: string };
}

// ── LessonProgram ──

export type LessonCategory = 'kinderen' | 'jongeren' | 'vrouwen' | 'mannen' | 'algemeen';

export interface RoosterItem {
  dag: string;
  startTijd: string;
  eindTijd: string;
  actief?: boolean;
}

export interface LessonProgram {
  _id: string;
  titel: string;
  categorie: LessonCategory;
  beschrijving?: string;
  inhoud?: PortableTextBlock[];
  afbeelding?: SanityImage;
  maxCapaciteit?: number;
  inschrijvingOpen?: boolean;
  vrijwilligersLink?: string;
  rooster?: RoosterItem[];
  volgorde?: number;
}

// ── EventCategory ──

export interface EventCategory {
  _id: string;
  titel: string;
  slug: string;
  kleur?: string;
  icoon?: string;
  volgorde?: number;
}

// ── Etiquette ──

export interface Etiquette {
  _id: string;
  titel: string;
  beschrijving?: string;
  volgorde?: number;
}
