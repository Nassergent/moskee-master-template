// Hijri datum berekening via Intl.DateTimeFormat (geen externe dependency)

interface HijriDate {
  day: number;
  month: number;
  monthName: string;
  year: number;
}

const HIJRI_MONTHS: Record<number, string> = {
  1: 'Muharram',
  2: 'Safar',
  3: "Rabi' al-Awwal",
  4: "Rabi' al-Thani",
  5: 'Jumada al-Ula',
  6: 'Jumada al-Thani',
  7: 'Rajab',
  8: "Sha'ban",
  9: 'Ramadan',
  10: 'Shawwal',
  11: "Dhul Qi'dah",
  12: 'Dhul Hijjah',
};

export function getIslamicMonthName(month: number): string {
  return HIJRI_MONTHS[month] || '';
}

export function getHijriDate(date?: Date): HijriDate {
  const d = date || new Date();
  const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
  const parts = formatter.formatToParts(d);
  const day = parseInt(parts.find((p) => p.type === 'day')?.value || '1');
  const month = parseInt(parts.find((p) => p.type === 'month')?.value || '1');
  const year = parseInt(parts.find((p) => p.type === 'year')?.value || '1446');

  return { day, month, monthName: getIslamicMonthName(month), year };
}

export function formatHijriDate(date?: Date): string {
  const h = getHijriDate(date);
  return `${h.day} ${h.monthName} ${h.year}`;
}

// ── Islamitische Kalender — Aladhan API ──

interface IslamicDay {
  name: string;
  nameAr: string;
  emoji: string;
  hijriMonth: number;
  hijriDay: number;
  gregorianDate: string; // ISO date
  daysUntil: number;
}

// Vaste islamitische dagen (hijri kalender)
const ISLAMIC_DAYS_CONFIG = [
  { key: 'showRamadan', name: 'Start Ramadan', nameAr: 'رمضان', emoji: '🌙', hijriMonth: 9, hijriDay: 1 },
  { key: 'showLailatAlQadr', name: 'Laylat al-Qadr', nameAr: 'ليلة القدر', emoji: '✨', hijriMonth: 9, hijriDay: 27 },
  { key: 'showEidFitr', name: 'Eid al-Fitr', nameAr: 'عيد الفطر', emoji: '🎉', hijriMonth: 10, hijriDay: 1 },
  { key: 'showArafah', name: 'Dag van Arafah', nameAr: 'يوم عرفة', emoji: '🕋', hijriMonth: 12, hijriDay: 9 },
  { key: 'showEidAdha', name: 'Eid al-Adha', nameAr: 'عيد الأضحى', emoji: '🐑', hijriMonth: 12, hijriDay: 10 },
  { key: 'showAshura', name: 'Ashura', nameAr: 'عاشوراء', emoji: '📿', hijriMonth: 1, hijriDay: 10 },
  { key: 'showIsraMiraj', name: "Isra' & Mi'raj", nameAr: 'الإسراء والمعراج', emoji: '🌌', hijriMonth: 7, hijriDay: 27 },
] as const;

/**
 * Haal islamitische feestdagen op via Aladhan API
 * Gebruikt hijriMonth/hijriDay om de gregorian date te berekenen
 */
export async function fetchIslamicDays(
  hijriAdjustment: number = 0,
  enabledDays?: Record<string, boolean>
): Promise<IslamicDay[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Huidige hijri datum om het juiste hijri jaar te bepalen
  const currentHijri = getHijriDate(today);
  const hijriYear = currentHijri.year;

  const results: IslamicDay[] = [];

  for (const day of ISLAMIC_DAYS_CONFIG) {
    // Check of deze dag is ingeschakeld in CMS
    if (enabledDays && enabledDays[day.key] === false) continue;

    try {
      // Probeer dit hijri jaar en volgend jaar
      for (const yearOffset of [0, 1]) {
        const targetYear = hijriYear + yearOffset;
        const dd = String(day.hijriDay).padStart(2, '0');
        const mm = String(day.hijriMonth).padStart(2, '0');
        const url = `https://api.aladhan.com/v1/hToG/${dd}-${mm}-${targetYear}?adjustment=${hijriAdjustment}`;
        const response = await fetch(url);
        if (!response.ok) continue;

        const data = await response.json();
        if (data.code !== 200 || !data.data?.gregorian) continue;

        const greg = data.data.gregorian;
        const gregorianDate = `${greg.year}-${greg.month.number.toString().padStart(2, '0')}-${greg.day.padStart(2, '0')}`;
        const eventDate = new Date(gregorianDate);
        eventDate.setHours(0, 0, 0, 0);

        const diffMs = eventDate.getTime() - today.getTime();
        const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));

        // Alleen toekomstige dagen (of vandaag) meenemen
        if (daysUntil >= 0) {
          results.push({
            name: day.name,
            nameAr: day.nameAr,
            emoji: day.emoji,
            hijriMonth: day.hijriMonth,
            hijriDay: day.hijriDay,
            gregorianDate,
            daysUntil,
          });
          break; // Niet ook volgend jaar checken
        }
      }
    } catch (e) {
      // API fout — sla deze dag over
      console.error(`Aladhan API error for ${day.name}:`, e);
    }
  }

  // Sorteer op dichtstbij
  return results.sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Haal de eerstvolgende islamitische dag op (binnen 30 dagen)
 * Voor de AnnouncementBar
 */
export async function getUpcomingIslamicDay(
  hijriAdjustment: number = 0,
  enabledDays?: Record<string, boolean>
): Promise<IslamicDay | null> {
  const days = await fetchIslamicDays(hijriAdjustment, enabledDays);
  // Alleen tonen als binnen 30 dagen
  const upcoming = days.find(d => d.daysUntil <= 30);
  return upcoming || null;
}

/**
 * Genereer aankondigingstekst voor een islamitische dag
 */
export function getAnnouncementText(day: IslamicDay): string {
  if (day.daysUntil === 0) {
    return `${day.emoji} Vandaag is ${day.name}`;
  }
  if (day.daysUntil === 1) {
    return `${day.emoji} Morgen is ${day.name}`;
  }
  return `${day.emoji} Nog ${day.daysUntil} dagen tot ${day.name}`;
}

// ── Calendar export helpers ──

interface CalendarEvent {
  titel: string;
  startDatum: string;
  eindDatum?: string | null;
  locatie?: string | null;
  beschrijving?: string | null;
  mosqueName?: string;
  address?: string;
}

function formatDateForGCal(isoDate: string): string {
  return isoDate.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const start = formatDateForGCal(event.startDatum);
  let end: string;
  if (event.eindDatum) {
    end = formatDateForGCal(event.eindDatum);
  } else {
    const endDate = new Date(event.startDatum);
    endDate.setHours(endDate.getHours() + 2);
    end = formatDateForGCal(endDate.toISOString());
  }

  const location = event.address
    ? `${event.locatie || ''}, ${event.mosqueName || ''}, ${event.address}`.replace(/^, /, '')
    : event.locatie || '';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.titel,
    dates: `${start}/${end}`,
    details: event.beschrijving || '',
    location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function generateIcsContent(event: CalendarEvent): string {
  const start = formatDateForGCal(event.startDatum);
  let end: string;
  if (event.eindDatum) {
    end = formatDateForGCal(event.eindDatum);
  } else {
    const endDate = new Date(event.startDatum);
    endDate.setHours(endDate.getHours() + 2);
    end = formatDateForGCal(endDate.toISOString());
  }

  const location = event.address
    ? `${event.locatie || ''}\\, ${event.mosqueName || ''}\\, ${event.address}`.replace(/^\\, /, '')
    : event.locatie || '';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Het Digitale Waqf//Agenda//NL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${event.titel}`,
    `DESCRIPTION:${(event.beschrijving || '').replace(/\n/g, '\\n')}`,
    `LOCATION:${location}`,
    `UID:${start}-${event.titel.replace(/\s/g, '')}@moskee.be`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
