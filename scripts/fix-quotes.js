/**
 * Fix script — verwijder citaten met verkeerde veldnamen en herplaats ze correct.
 */
import { createClient } from '@sanity/client';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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
} catch {}

const client = createClient({
  projectId: 'qjg8nn9m',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_TOKEN || '',
});

// 1. Zoek alle citaten en toon hun velden
const allQuotes = await client.fetch(`*[_type == "quote"]{ _id, tekst, text, bron, source, reference, categorie, actief, isPublished }`);
console.log(`Gevonden: ${allQuotes.length} citaten\n`);

for (const q of allQuotes) {
  const hasTekst = !!q.tekst;
  const hasText = !!q.text;
  console.log(`  ${q._id}: tekst=${hasTekst}, text=${hasText}, bron="${q.bron || ''}", source="${q.source || ''}""`);
}

// 2. Verwijder citaten met oude veldnamen (text ipv tekst) die "Untitled" tonen
const broken = allQuotes.filter(q => !q.tekst && q.text);
console.log(`\n${broken.length} citaten met verkeerde veldnamen gevonden, worden verwijderd...`);

for (const q of broken) {
  await client.delete(q._id);
  console.log(`  ✓ Verwijderd: ${q._id}`);
}

// 3. Herplaats alle 5 citaten met correcte veldnamen
const correctQuotes = [
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

console.log(`\n5 citaten opnieuw plaatsen met correcte veldnamen...`);
for (const q of correctQuotes) {
  await client.createOrReplace(q);
  console.log(`  ✓ ${q.bron}: ${q.tekst.substring(0, 50)}...`);
}

console.log('\nKlaar! Alle citaten hebben nu de juiste veldnamen.');
