/**
 * Content Seed — Het Digitale Waqf
 *
 * Vult Sanity aan met projecten, agenda, nieuws en extra citaten.
 * Gebruik: npm run seed:content
 */

import { createClient } from '@sanity/client';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Laad .env handmatig
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([\w.]+)\s*=\s*(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
} catch { /* .env niet gevonden */ }

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
if (!projectId) throw new Error('Missing PUBLIC_SANITY_PROJECT_ID in .env');

const client = createClient({
  projectId,
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_TOKEN || '',
});

// ── Helpers ──

function futureDate(daysFromNow, hours = 10, minutes = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function nextWeekday(dayOfWeek, hours = 10, minutes = 0) {
  const d = new Date();
  const diff = (dayOfWeek - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

// ── 1. Projecten (originele veldnamen: titel, beschrijving, doelbedrag, huidigBedrag, actief) ──

const projects = [
  {
    _id: 'project-renovatie-gebedsruimte',
    _type: 'project',
    titel: 'Renovatie Gebedsruimte',
    beschrijving: 'Help ons de gebedsruimte te voorzien van nieuw tapijt en duurzame verlichting.',
    doelbedrag: 25000,
    huidigBedrag: 17500,
    actief: true,
  },
  {
    _id: 'project-ramadan-voedselpakketten',
    _type: 'project',
    titel: 'Ramadan Voedselpakketten',
    beschrijving: 'Samen zorgen we dat elke behoeftige familie in onze stad een gezonde Iftar heeft.',
    doelbedrag: 5000,
    huidigBedrag: 2100,
    actief: true,
  },
];

// ── 2. Agenda Evenementen ──

const events = [
  {
    _id: 'event-jongerenavond',
    _type: 'agendaEvent',
    titel: 'Jongerenavond: Identiteit & Geloof',
    slug: { _type: 'slug', current: 'jongerenavond-identiteit-geloof' },
    startDatum: futureDate(5, 18, 30),
    eindDatum: futureDate(5, 21, 0),
    locatie: 'Grote Zaal',
    categorie: 'Jeugd',
    beschrijving: 'Een interactieve avond voor jongeren (16-30 jaar) over identiteit, geloof en de uitdagingen van het dagelijks leven. Met gastsprekers, workshops en ruimte voor vragen.',
    gepubliceerd: true,
  },
  {
    _id: 'event-tafsir-dames',
    _type: 'agendaEvent',
    titel: 'Wekelijkse Tafsir Les (Dames)',
    slug: { _type: 'slug', current: 'wekelijkse-tafsir-les-dames' },
    startDatum: nextWeekday(0, 13, 30),
    eindDatum: nextWeekday(0, 15, 0),
    locatie: 'Vrouwenruimte',
    categorie: 'Onderwijs',
    beschrijving: 'Elke zondag na het Dhuhr-gebed bespreken we samen een passage uit de Koran. Geschikt voor alle niveaus. Kinderopvang beschikbaar.',
    gepubliceerd: true,
  },
  {
    _id: 'event-schoonmaakdag',
    _type: 'agendaEvent',
    titel: 'Schoonmaakdag Moskee',
    slug: { _type: 'slug', current: 'schoonmaakdag-moskee' },
    startDatum: nextWeekday(6, 10, 0),
    eindDatum: nextWeekday(6, 13, 0),
    locatie: 'Hele moskee',
    categorie: 'Gemeenschap',
    beschrijving: 'Doe mee met de grote schoonmaak! Samen maken we ons gebedshuis weer fris en netjes. Neem werkhandschoenen mee als je die hebt. Lunch wordt voorzien.',
    gepubliceerd: true,
  },
];

// ── 3. Nieuws / Blog ──

const posts = [
  {
    _id: 'post-ramadan-programma-2026',
    _type: 'post',
    titel: 'Ramadan Programma 2026',
    slug: { _type: 'slug', current: 'ramadan-programma-2026' },
    datum: new Date().toISOString().split('T')[0],
    samenvatting: 'Bekijk hier het volledige overzicht van onze Iftar-maaltijden en Taraweeh-gebeden.',
    inhoud: [
      {
        _type: 'block',
        _key: 'ramadan-intro',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'ramadan-span-1',
            text: 'Bismillah! De heilige maand Ramadan staat voor de deur. Ons programma omvat dagelijkse Iftar-maaltijden, Taraweeh-gebeden en speciale lezingen.',
            marks: [],
          },
        ],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'ramadan-details',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'ramadan-span-2',
            text: 'Iftar wordt elke avond geserveerd 15 minuten voor Maghrib. Taraweeh-gebeden beginnen direct na het Isha-gebed. Op vrijdagavonden is er een speciale lezing door een gastspreker.',
            marks: [],
          },
        ],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'ramadan-cta',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'ramadan-span-3',
            text: 'Wilt u bijdragen aan de Iftar-maaltijden? Neem contact op of doneer via onze website. Moge Allah ons allen een gezegende Ramadan schenken.',
            marks: [],
          },
        ],
        markDefs: [],
      },
    ],
    gepubliceerd: true,
  },
  {
    _id: 'post-nieuwe-arabische-lessen',
    _type: 'post',
    titel: 'Nieuwe Arabische lessen gestart',
    slug: { _type: 'slug', current: 'nieuwe-arabische-lessen-gestart' },
    datum: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    samenvatting: 'Inschrijvingen voor het nieuwe semester zijn nu geopend voor alle niveaus.',
    inhoud: [
      {
        _type: 'block',
        _key: 'arabisch-intro',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'arabisch-span-1',
            text: 'Alhamdulillah, het nieuwe semester Arabische lessen is officieel gestart! Of u nu beginner bent of al gevorderd, er is een klas die bij u past.',
            marks: [],
          },
        ],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'arabisch-niveaus',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'arabisch-span-2',
            text: 'We bieden drie niveaus aan: Beginners (maandag 19:00), Gevorderden (woensdag 19:00) en Koranisch Arabisch (vrijdag 19:00). Lessen duren 90 minuten en worden gegeven door ervaren docenten.',
            marks: [],
          },
        ],
        markDefs: [],
      },
    ],
    gepubliceerd: true,
  },
];

// ── 4. Citaten (originele veldnamen: tekst, bron, categorie, actief) ──

const quotes = [
  // Overschrijf de 2 eerder geseede citaten met correcte veldnamen
  {
    _id: 'quote-quran-2-261',
    _type: 'quote',
    tekst: 'Het voorbeeld van degenen die hun rijkdom besteden op de weg van Allah is als een zaadkorrel die zeven aren voortbrengt, in elke aar honderd korrels.',
    bron: 'Quran 2:261',
    categorie: 'donaties',
    actief: true,
  },
  {
    _id: 'quote-tirmidhi-2616',
    _type: 'quote',
    tekst: 'Sadaqah dooft de zonde uit zoals water het vuur dooft.',
    bron: 'Sunan at-Tirmidhi 2616',
    categorie: 'donaties',
    actief: true,
  },
  // 3 nieuwe citaten over Kennis en Gemeenschap
  {
    _id: 'quote-muslim-2699',
    _type: 'quote',
    tekst: 'Wie een pad bewandelt om kennis te zoeken, voor hem maakt Allah een pad naar het Paradijs gemakkelijk.',
    bron: 'Sahih Muslim 2699',
    categorie: 'kennis',
    actief: true,
  },
  {
    _id: 'quote-quran-49-10',
    _type: 'quote',
    tekst: 'Voorwaar, de gelovigen zijn slechts broeders. Dus sticht vrede tussen uw broeders en vrees Allah, opdat u barmhartigheid wordt geschonken.',
    bron: 'Quran 49:10',
    categorie: 'gemeenschap',
    actief: true,
  },
  {
    _id: 'quote-muslim-2586',
    _type: 'quote',
    tekst: 'Het voorbeeld van de gelovigen in hun onderlinge liefde, barmhartigheid en mededogen is als dat van één lichaam: wanneer één ledemaat ervan lijdt, reageert het hele lichaam met slapeloosheid en koorts.',
    bron: 'Sahih Muslim 2586',
    categorie: 'gemeenschap',
    actief: true,
  },
];

// ── Seed uitvoeren ──

const allDocs = [...projects, ...events, ...posts, ...quotes];

console.log(`Seeding ${allDocs.length} content documenten naar Sanity...\n`);

for (const doc of allDocs) {
  try {
    await client.createOrReplace(doc);
    const label = doc.titel || doc.tekst?.substring(0, 40) || doc._id;
    console.log(`  ✓ ${doc._type}: ${label}`);
  } catch (err) {
    const label = doc.titel || doc._id;
    console.error(`  ✗ ${doc._type} (${label}): ${err.message}`);
  }
}

console.log('\nContent seed voltooid!');
