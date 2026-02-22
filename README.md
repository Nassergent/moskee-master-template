# Het Digitale Waqf — Moskee Master Template

Professionele moskee-website template. Elke moskee krijgt een eigen website met Sanity CMS, gebedstijden, donaties, agenda en islamitische kalender.

**Stack:** Astro v5 + Tailwind CSS v4 + React Islands + Sanity v3 + Mollie + Vercel

---

## Nieuwe Moskee Toevoegen — Stap voor Stap

### Stap 1: Sanity Project Aanmaken

1. Ga naar [sanity.io/manage](https://www.sanity.io/manage)
2. Klik **"Create new project"**
3. Naam: bijv. `Moskee El Albani`
4. Plan: **Free** (voldoende voor 1 moskee)
5. Noteer het **Project ID** (bijv. `abc123xyz`)
6. Ga naar **API** → **Tokens**:
   - Maak een **Read** token → noteer als `SANITY_API_TOKEN`
   - Maak een **Write** token → noteer als `SANITY_WRITE_TOKEN`
7. Ga naar **API** → **CORS Origins**:
   - Voeg toe: `https://jouw-moskee.vercel.app` (Allow credentials: ✓)
   - Voeg toe: `http://localhost:4321` (voor development)

### Stap 2: Repository Klonen

```bash
# Kloon de template
git clone https://github.com/Nassergent/moskee-master-template.git moskee-el-albani
cd moskee-el-albani

# Verwijder de originele remote
git remote remove origin

# Maak een nieuwe private repo (optioneel)
gh repo create moskee-el-albani --private --source=. --push
```

### Stap 3: Environment Variables

Kopieer `.env.example` naar `.env` en vul in:

```env
# Sanity CMS (uit Stap 1)
PUBLIC_SANITY_PROJECT_ID=abc123xyz
PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=sk...read-token...
SANITY_WRITE_TOKEN=sk...write-token...

# Mollie Betalingen (uit Stap 5)
MOLLIE_API_KEY=test_xxxxxxxxxxxx
MOLLIE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# Resend E-mail (uit Stap 6)
RESEND_API_KEY=re_xxxxxxxxxxxx
```

### Stap 4: Project ID Aanpassen

Vervang het project ID op **drie plekken**:

1. **`sanity.config.ts`** → `projectId: 'abc123xyz'`
2. **`astro.config.mjs`** → `projectId: 'abc123xyz'`
3. **`sanity/lib/client.ts`** → fallback `|| 'abc123xyz'`

### Stap 5: Mollie Account

1. Registreer op [mollie.com](https://www.mollie.com)
2. Doorloop de verificatie (KVK/VZW nodig)
3. Ga naar **Developers** → **API keys**
4. Kopieer de **Test API key** → `MOLLIE_API_KEY` in `.env`
5. Na goedkeuring: vervang door de **Live API key**

> **Let op:** Zonder Mollie key werkt het donatieformulier in demo-modus (redirect naar bedankt-pagina zonder echte betaling).

### Stap 5b: Mollie Webhook Configuratie

De webhook zorgt ervoor dat de site automatisch een bevestiging stuurt na een succesvolle betaling. **Zonder webhook ontvangt de site geen betalingsbevestigingen van Mollie.**

1. Ga in het Mollie Dashboard naar **Developers** → **Webhooks**
2. Klik op **"Webhook aanmaken"**
3. Vul bij **Webhook-URL** het adres van de moskee-website in, gevolgd door `/api/mollie-webhook`:
   ```
   https://uwdomein.nl/api/mollie-webhook
   ```
   Voorbeeld: `https://moskee-master-template.vercel.app/api/mollie-webhook`
4. Vink bij **Evenementtypes** de optie **`payment.paid`** aan
5. Klik op **Opslaan** — Mollie toont nu een **Secret** (begint met `whsec_`)
6. Kopieer deze Secret en plak deze als `MOLLIE_WEBHOOK_SECRET` in:
   - Je lokale **`.env`** bestand
   - **Vercel** → Project Settings → Environment Variables

> **Belangrijk:** Met een `live_` API key is de webhook secret **verplicht**. De site weigert webhooks zonder geldige HMAC-SHA256 signature. Dit voorkomt dat kwaadwillenden nep-betalingen kunnen triggeren.

### Stap 6: Resend E-mail (optioneel)

1. Registreer op [resend.com](https://resend.com)
2. Maak een API key aan → `RESEND_API_KEY` in `.env`
3. Voeg een afzenderdomein toe voor productie

> Zonder Resend key worden contactformulier-berichten gelogd in de console.

### Stap 7: Lokaal Testen

```bash
npm install
npm run dev
```

- Website: `http://localhost:4321`
- CMS Studio: `http://localhost:4321/admin`

### Stap 8: Vercel Deployment

1. Ga naar [vercel.com](https://vercel.com) → **"Add New Project"**
2. Importeer de GitHub repository
3. Framework Preset: **Astro**
4. Voeg **Environment Variables** toe (alles uit `.env`):

| Variable | Waarde |
|----------|--------|
| `PUBLIC_SANITY_PROJECT_ID` | `abc123xyz` |
| `PUBLIC_SANITY_DATASET` | `production` |
| `SANITY_API_TOKEN` | `sk...read-token...` |
| `SANITY_WRITE_TOKEN` | `sk...write-token...` |
| `MOLLIE_API_KEY` | `test_xxx` of `live_xxx` |
| `MOLLIE_WEBHOOK_SECRET` | `whsec_xxx` (uit Developers → Webhooks) |
| `RESEND_API_KEY` | `re_xxx` |

5. Klik **Deploy**
6. Na deployment: voeg het Vercel-domein toe aan Sanity CORS (Stap 1.7)

### Stap 9: Sanity Webhook (Auto-Deploy)

Zorgt dat de website automatisch herbuildt wanneer content wordt gepubliceerd:

1. Ga naar Vercel → Project → **Settings** → **Git** → **Deploy Hooks**
2. Maak een hook aan: naam `Sanity`, branch `main`
3. Kopieer de URL (bijv. `https://api.vercel.com/v1/integrations/deploy/prj_xxx/xxx`)
4. Ga naar [sanity.io/manage](https://www.sanity.io/manage) → jouw project → **API** → **Webhooks**
5. Maak een webhook aan:
   - **Name:** `Vercel Deploy`
   - **URL:** plak de Vercel Deploy Hook URL
   - **Dataset:** `production`
   - **Trigger on:** Create, Update, Delete
   - **Filter:** (leeg laten = alles)
6. **Sla op** — nu rebuildt de site bij elke publicatie in het CMS

### Stap 10: Eerste Content Invullen

Ga naar `https://jouw-moskee.vercel.app/admin` en vul in:

1. **⚙️ Site Instellingen** — Moskee naam, logo, kleuren (60-30-10), contact, IBAN
2. **🕒 Gebedstijden** — Mawaqit slug (zoek je moskee op mawaqit.net), Jumu'ah tijden
3. **🏠 Home Pagina** — Hero tekst, afbeelding, badges
4. **📜 Over Ons** — Missie tekst, waarden, teamleden
5. **📞 Contact** — Intro tekst, openingstijden, formulier-onderwerpen

---

## Projectstructuur

```
├── sanity/
│   ├── schemas/          # 12 Sanity document types
│   ├── structure.ts      # CMS sidebar layout
│   └── lib/client.ts     # Sanity client configuratie
├── src/
│   ├── components/       # Astro + React componenten
│   ├── layouts/          # BaseLayout met OG tags + Schema.org
│   ├── lib/
│   │   ├── sanity.ts     # Fetch helpers + demo data
│   │   ├── hijri.ts      # Islamitische kalender + Aladhan API
│   │   └── security.ts   # Rate limiting + validatie
│   ├── pages/
│   │   ├── api/          # Contact, vrijwilligers, donatie, webhook
│   │   ├── agenda/       # Evenementen overzicht + detail
│   │   ├── diensten/     # Diensten overzicht + detail
│   │   ├── nieuws/       # Nieuws overzicht + detail
│   │   └── ...           # Home, over-ons, contact, doneren, bedankt
│   └── styles/global.css # Tailwind v4 theme + flat design
├── sanity.config.ts      # Sanity Studio config
├── astro.config.mjs      # Astro + Vercel adapter
└── .env.example          # Environment variabelen template
```

## Features

- **Gebedstijden** — Mawaqit widget + Jumu'ah shifts uit CMS
- **Islamitische Kalender** — Hijri datum + Aladhan API feestdagen + AnnouncementBar
- **Donaties** — Mollie (Bancontact, iDEAL, creditcard) + bankgegevens
- **Agenda** — Evenementen met AddToCalendar (Google Cal + iCal)
- **Nieuws** — Blog met rich text (Portable Text)
- **Vrijwilligersbank** — Aanmeldformulier → direct in CMS
- **60-30-10 Theming** — Kleuren volledig aanpasbaar vanuit CMS
- **Flat Design** — Geen afgeronde hoeken, geen schaduwen, 3px accent borders
- **SEO** — Schema.org Mosque, OpenGraph, canonical URLs
- **Beveiliging** — Rate limiting, honeypot, input sanitization

## Licentie

Eigendom van Het Digitale Waqf. Niet voor hergebruik zonder toestemming.





Het Digitale Waqf — SaaS Platform Management Guide
Dit document bevat de instructies voor het beheren van de Moskee Master Template en de geautomatiseerde vloot van moskee-websites.
🚀 Concept: De "Moeder & Kinderen" Strategie
Master Template (Moeder): Alle nieuwe functies en bugfixes worden hier gebouwd.
Moskee Repos (Kinderen): Individuele installaties voor moskeeën (bijv. moskee-el-fath). Zij halen hun code van de Master, maar hun data uit een eigen Sanity Project.
🛠️ Stap 1: Een Nieuwe Moskee Onboarden (± 20 min)
Gebruik het script waqf-onboard.sh op je Desktop om de technische basis in 5 minuten neer te zetten.
GitHub: Maak een nieuwe lege repository aan op GitHub (bijv. moskee-naam).
Sanity: Maak een nieuw project aan op sanity.io/manage. Noteer de PROJECT_ID.
Mollie: (Indien nodig) Maak een Mollie-profiel aan voor de moskee en kopieer de API_KEY.
Onboard Script: Draai dit op je computer:
code
Bash
./waqf-onboard.sh <ID> <REPO_URL> "<NAAM_MOSKEE>"
# Voorbeeld: ./waqf-onboard.sh el-fath https://github.com/Nassergent/moskee-el-fath.git "Moskee El Fath"
Vercel:
Importeer de nieuwe repo in Vercel.
Voeg de .env variabelen toe (Project ID, Mollie Key, etc.).
Koppel het domein.
Webhook: Stel in Sanity de Vercel Deploy Hook in zodat de site update bij 'Publish'.
🔄 Stap 2: De Vloot Updaten (De Master Update)
Wanneer je een verbetering hebt gemaakt in de moskee-master-template, volg je dit proces:
Commit & Push je wijzigingen in de Master Template repo naar GitHub.
Ga naar je Desktop en draai het update-script:
code
Bash
./waqf-update-all.sh
Wat gebeurt er? Het script loopt langs alle moskeeën in mosques.json, haalt de nieuwe code van de Master op, voegt het samen (merge) en pusht het naar hun eigen GitHub, waardoor Vercel de sites gaat herbouwen.
⚠️ Belangrijke Regels (Don'ts)
PAS NOOIT CODE AAN IN DE MAP VAN EEN SPECIFIEKE MOSKEE.
Wil je iets veranderen? Doe het in de Master Template. Als je code aanpast in een kind-repo, krijg je "Merge Conflicts" en stopt het automatische systeem met werken.
Sanity Data is veilig: Het updaten van de code heeft geen invloed op de teksten en foto's in Sanity. De "muren" worden vernieuwd, maar de "meubels" blijven staan.
📋 Benodigde Environment Variables (Vercel)
Elke moskee heeft deze unieke sleutels nodig in Vercel:
PUBLIC_SANITY_PROJECT_ID: De unieke sleutel van hun Sanity project.
SANITY_API_TOKEN: Voor het lezen van data.
SANITY_WRITE_TOKEN: Voor het opslaan van vrijwilligers/donaties.
MOLLIE_API_KEY: Voor hun eigen bankrekening.
MOLLIE_WEBHOOK_SECRET: Webhook secret uit Mollie Dashboard (Developers → Webhooks).
RESEND_API_KEY: Voor de branded e-mail notificaties.
UPSTASH_REDIS_REST_URL & TOKEN: Voor de beveiliging (rate limiting).
🛡️ Onderhoud & Support
Als een update mislukt (rood in het rapport), ga dan naar de map van die moskee en los het handmatig op:
code
Bash
cd moskee-naam
git status
# Los conflicten op en commit
git push origin main
Waarom deze README handig is voor jou:
Je hoeft niet meer te onthouden wat de stappen zijn.
Als je ooit iemand aanneemt om je te helpen, kan diegene met dit document direct aan de slag.
Het herinnert je aan de Gouden Regel: werk alleen in de Master Template.
Zet deze tekst in je README.md van je hoofdproject. Dan ben je vanaf nu de baas over je eigen systeem! 🚀🌙