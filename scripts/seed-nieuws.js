/**
 * Seed Nieuws & Blog — 5 nieuwsberichten + 5 blogartikelen
 */
import { createClient } from '@sanity/client';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from './lib/load-env.js';

loadEnv(import.meta.url);

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
if (!projectId) throw new Error('Missing PUBLIC_SANITY_PROJECT_ID in .env');

const client = createClient({
  projectId,
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_TOKEN || '',
});

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function block(key, text) {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [{ _type: 'span', _key: key + '-s', text, marks: [] }],
  };
}

const posts = [
  // ── 5 Nieuwsberichten ──
  {
    _id: 'post-eid-al-fitr-viering',
    _type: 'post',
    titel: 'Eid al-Fitr Viering — Programma & Tijden',
    slug: { _type: 'slug', current: 'eid-al-fitr-viering' },
    datum: daysAgo(1),
    samenvatting: 'Alle praktische info over het Eid-gebed, de locatie en het feestprogramma voor het hele gezin.',
    inhoud: [
      block('eid-1', 'Het Eid al-Fitr gebed vindt plaats om 08:00 en 09:30 in de grote gebedsruimte. Kom op tijd en neem uw eigen gebedskleed mee.'),
      block('eid-2', 'Na het gebed is er een feestelijk ontbijt met zoetigheden voor alle families. Kinderen ontvangen een cadeautje. We vragen iedereen een gerecht mee te brengen om te delen.'),
    ],
    gepubliceerd: true,
  },
  {
    _id: 'post-iftar-vrijwilligers-gezocht',
    _type: 'post',
    titel: 'Vrijwilligers gezocht voor dagelijkse Iftar',
    slug: { _type: 'slug', current: 'iftar-vrijwilligers-gezocht' },
    datum: daysAgo(3),
    samenvatting: 'Help mee met koken, serveren en opruimen tijdens de Ramadan Iftar-maaltijden.',
    inhoud: [
      block('iftar-1', 'Tijdens de Ramadan serveren wij elke avond een warme Iftar-maaltijd voor 100+ gemeenschapsleden. Hiervoor hebben wij dringend vrijwilligers nodig.'),
      block('iftar-2', 'U kunt zich aanmelden voor koken (vanaf 14:00), serveren (vanaf Maghrib) of opruimen (na Isha). Elke bijdrage telt! Meld u aan via het vrijwilligersformulier op onze website.'),
    ],
    gepubliceerd: true,
  },
  {
    _id: 'post-parkeerbeleid-update',
    _type: 'post',
    titel: 'Nieuw parkeerbeleid rond de moskee',
    slug: { _type: 'slug', current: 'parkeerbeleid-update' },
    datum: daysAgo(7),
    samenvatting: 'Nieuwe afspraken over parkeren tijdens het vrijdaggebed om overlast voor buren te voorkomen.',
    inhoud: [
      block('park-1', 'In overleg met de gemeente en onze buren zijn er nieuwe parkeerafspraken gemaakt. Parkeer alleen op de aangeduide plaatsen en vermijd de straten direct rond de moskee.'),
      block('park-2', 'Er is extra parkeergelegenheid beschikbaar op het terrein achter het gemeenschapscentrum (5 minuten lopen). Carpoolen wordt sterk aangemoedigd.'),
    ],
    gepubliceerd: true,
  },
  {
    _id: 'post-renovatie-update',
    _type: 'post',
    titel: 'Renovatie gebedsruimte vordert goed',
    slug: { _type: 'slug', current: 'renovatie-update' },
    datum: daysAgo(10),
    samenvatting: 'De werkzaamheden aan het nieuwe tapijt en de verlichting liggen op schema. Bekijk de voortgang.',
    inhoud: [
      block('reno-1', 'Alhamdulillah, de renovatie van de gebedsruimte verloopt volgens planning. Het nieuwe tapijt is besteld en wordt volgende week gelegd.'),
      block('reno-2', 'De LED-verlichting is al geïnstalleerd en geeft een warme, rustgevende sfeer. We bedanken alle donateurs die dit mogelijk hebben gemaakt. Er is nog 30% van het doelbedrag nodig.'),
    ],
    gepubliceerd: true,
  },
  {
    _id: 'post-open-moskee-dag',
    _type: 'post',
    titel: 'Open Moskee Dag — Iedereen welkom',
    slug: { _type: 'slug', current: 'open-moskee-dag' },
    datum: daysAgo(14),
    samenvatting: 'Op zondag openen wij onze deuren voor buren en geïnteresseerden. Rondleiding, thee en uitleg over de islam.',
    inhoud: [
      block('open-1', 'In het kader van de nationale Open Moskeeën Dag verwelkomen wij iedereen op zondag tussen 11:00 en 16:00. Er zijn rondleidingen, presentaties en ruimte voor vragen.'),
      block('open-2', 'Geniet van Marokkaanse thee en gebak terwijl u meer leert over onze gemeenschap. Kinderen kunnen deelnemen aan een Arabische kalligrafie-workshop.'),
    ],
    gepubliceerd: true,
  },

  // ── 5 Blogberichten ──
  {
    _id: 'post-blog-belang-van-gemeenschap',
    _type: 'post',
    titel: 'Het belang van gemeenschap in de islam',
    slug: { _type: 'slug', current: 'belang-van-gemeenschap' },
    datum: daysAgo(5),
    samenvatting: 'Waarom de moskee meer is dan een gebedshuis — een reflectie over ummah en saamhorigheid.',
    inhoud: [
      block('gem-1', 'De Profeet \u2e3a zei: "De gelovigen zijn in hun onderlinge liefde en mededogen als \xe9\xe9n lichaam." Dit hadith vormt de kern van hoe wij als moskee functioneren.'),
      block('gem-2', 'Een moskee is niet alleen een plek om te bidden. Het is een ontmoetingsplek, een school, een steunpunt voor wie hulp nodig heeft. Wanneer wij samenkomen, versterken wij elkaar.'),
      block('gem-3', 'Wij moedigen iedereen aan om actief deel te nemen aan het gemeenschapsleven. Of het nu gaat om vrijwilligerswerk, het bijwonen van lessen of simpelweg uw buurman begroeten na het gebed.'),
    ],
    gepubliceerd: true,
  },
  {
    _id: 'post-blog-kinderen-en-koran',
    _type: 'post',
    titel: 'Tips voor ouders: kinderen en de Koran',
    slug: { _type: 'slug', current: 'kinderen-en-koran' },
    datum: daysAgo(12),
    samenvatting: 'Praktische adviezen om uw kinderen op een liefdevolle manier vertrouwd te maken met de Koran.',
    inhoud: [
      block('kind-1', 'Het leren van de Koran begint thuis. Maak er een dagelijks ritueel van: lees samen na Fajr of voor het slapengaan. Zelfs 10 minuten per dag maken een groot verschil.'),
      block('kind-2', 'Gebruik positieve bekrachtiging. Beloon inspanning, niet alleen resultaat. Een kind dat met plezier leert, zal de Koran zijn hele leven blijven reciteren.'),
      block('kind-3', 'Onze moskee biedt speciale kinderlessen aan op zaterdag en zondag. De docenten werken met spel, zang en verhalen om de liefde voor de Koran over te brengen.'),
    ],
    gepubliceerd: true,
  },
  {
    _id: 'post-blog-dua-dagelijks-leven',
    _type: 'post',
    titel: 'De kracht van dua in het dagelijks leven',
    slug: { _type: 'slug', current: 'dua-dagelijks-leven' },
    datum: daysAgo(18),
    samenvatting: 'Hoe dagelijkse smeekbeden uw leven kunnen verrijken — met praktische voorbeelden.',
    inhoud: [
      block('dua-1', 'Dua is het wapen van de gelovige. Het is een directe lijn naar Allah, beschikbaar op elk moment, op elke plek. U hebt geen wudhu nodig, geen specifieke richting — alleen een oprecht hart.'),
      block('dua-2', 'Begin met de dua bij het wakker worden, bij het eten, bij het verlaten van huis. Deze kleine gewoonten transformeren uw dag in een doorlopend gesprek met uw Schepper.'),
    ],
    gepubliceerd: true,
  },
  {
    _id: 'post-blog-ramadan-voorbereiden',
    _type: 'post',
    titel: 'Zo bereidt u zich voor op de Ramadan',
    slug: { _type: 'slug', current: 'ramadan-voorbereiden' },
    datum: daysAgo(25),
    samenvatting: 'Een stap-voor-stap gids om spiritueel en praktisch klaar te zijn voor de heilige maand.',
    inhoud: [
      block('ram-1', 'Begin twee weken voor Ramadan met het vasten op maandag en donderdag. Dit bereidt uw lichaam voor en is tegelijk een soennapraktijk.'),
      block('ram-2', 'Maak een persoonlijk plan: welke soera wilt u memoriseren? Hoeveel Koran wilt u lezen? Welke slechte gewoonte wilt u afleren? Schrijf het op en hang het zichtbaar op.'),
      block('ram-3', 'Praktisch: vul uw vriezer met maaltijden, organiseer uw werkschema en informeer collega\'s. Hoe beter u voorbereid bent, hoe meer u zich kunt focussen op het spirituele.'),
    ],
    gepubliceerd: true,
  },
  {
    _id: 'post-blog-moskee-etiquette',
    _type: 'post',
    titel: 'Moskee-etiquette: de ongeschreven regels',
    slug: { _type: 'slug', current: 'moskee-etiquette-uitleg' },
    datum: daysAgo(30),
    samenvatting: 'Een vriendelijke gids over de gebruiken en omgangsvormen in de moskee voor nieuwkomers.',
    inhoud: [
      block('etiq-1', 'De moskee is het huis van Allah. Wanneer u binnenkomt, begroet de aanwezigen met salaam, doe uw schoenen uit en bid twee rakat tahiyyat al-masjid als begroeting.'),
      block('etiq-2', 'Zet uw telefoon op stil, praat zachtjes en respecteer mensen die aan het bidden of Koran aan het lezen zijn. De moskee is een plek van rust en bezinning.'),
      block('etiq-3', 'Na het gebed, neem een moment om uw buurman te begroeten. Een glimlach is sadaqah. Laat de plek schoner achter dan u hem aantrof.'),
    ],
    gepubliceerd: true,
  },
];

console.log(`Seeding ${posts.length} berichten naar Sanity...\n`);
for (const p of posts) {
  await client.createOrReplace(p);
  console.log(`  \u2713 ${p.titel}`);
}
console.log('\nKlaar!');
