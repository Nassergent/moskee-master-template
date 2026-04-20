import { useState } from 'react';
import { useToast } from '@sanity/ui';
import { RRule, Frequency, Weekday } from 'rrule';
import { useClient, type DocumentActionComponent, type DocumentActionProps, type SanityDocument } from 'sanity';

interface AgendaEventDoc extends SanityDocument {
  titel?: string;
  slug?: { current?: string };
  startDatum?: string;
  eindDatum?: string;
  locatie?: string;
  locatieAnders?: string;
  categorieRef?: { _ref: string; _type: 'reference' };
  gepubliceerd?: boolean;
  doelgroep?: string;
  featured?: boolean;
  prioriteit?: number;
  beschrijving?: unknown;
  afbeelding?: unknown;
  onderwerpHub?: { _ref: string; _type: 'reference' };
  registrationOpen?: boolean;
  registrationMax?: number;
  registrationDeadline?: string;
  externalRegistrationUrl?: string;
  isHerhalend?: boolean;
  frequentie?: 'weekly' | 'biweekly' | 'monthly';
  eindDatumReeks?: string;
  cancelled?: boolean;
}

const WEEKDAY_INDEX: Weekday[] = [RRule.SU, RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA];

function formatDateSlug(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function shiftDate(original: Date, newDate: Date): Date {
  const shifted = new Date(newDate);
  shifted.setHours(original.getHours(), original.getMinutes(), original.getSeconds(), original.getMilliseconds());
  return shifted;
}

export const generateRecurringInstancesAction: DocumentActionComponent = (props: DocumentActionProps) => {
  const { draft, published, onComplete } = props;
  const [running, setRunning] = useState(false);
  const toast = useToast();
  const client = useClient({ apiVersion: '2024-01-01' });

  const doc = (draft || published) as AgendaEventDoc | null;

  const isRecurring = !!doc?.isHerhalend;
  const hasRequiredFields = !!doc
    && !!doc.titel
    && !!doc.slug?.current
    && !!doc.startDatum
    && !!doc.frequentie
    && !!doc.eindDatumReeks;

  // Hide the action entirely when the event is not recurring — keeps UI clean for standalone events.
  if (!isRecurring) return null;

  return {
    label: running ? 'Bezig met genereren…' : 'Genereer volgende datums',
    icon: () => '🔁',
    disabled: !hasRequiredFields || running,
    onHandle: async () => {
      if (!doc || !hasRequiredFields) {
        onComplete();
        return;
      }

      setRunning(true);
      try {
        const start = new Date(doc.startDatum!);
        const endOfSeries = new Date(doc.eindDatumReeks!);
        endOfSeries.setHours(23, 59, 59, 999);

        const duration = doc.eindDatum
          ? new Date(doc.eindDatum).getTime() - start.getTime()
          : 0;

        const freq = doc.frequentie === 'monthly' ? Frequency.MONTHLY : Frequency.WEEKLY;
        const interval = doc.frequentie === 'biweekly' ? 2 : 1;

        const ruleOptions: Parameters<typeof RRule>[0] = {
          freq,
          interval,
          dtstart: start,
          until: endOfSeries,
        };

        if (doc.frequentie === 'monthly') {
          ruleOptions.bymonthday = [start.getDate()];
        } else {
          ruleOptions.byweekday = [WEEKDAY_INDEX[start.getDay()]];
        }

        const rule = new RRule(ruleOptions);
        const allOccurrences = rule.all();
        // Skip the first occurrence — it IS the current document
        const futureOccurrences = allOccurrences.filter(
          (d) => d.getTime() > start.getTime()
        );

        if (futureOccurrences.length === 0) {
          toast.push({
            status: 'warning',
            title: 'Geen volgende datums gevonden',
            description: 'Controleer de frequentie en einddatum van de reeks.',
          });
          return;
        }

        const baseSlug = doc.slug!.current!;
        const templateId = doc._id.replace(/^drafts\./, '');

        // Load existing instance slugs to stay idempotent
        const existing: { slug?: { current?: string } }[] = await client.fetch(
          `*[_type == "agendaEvent" && slug.current match $pattern]{ "slug": slug }`,
          { pattern: `${baseSlug}-*` }
        );
        const existingSlugs = new Set(
          existing.map((e) => e.slug?.current).filter(Boolean) as string[]
        );

        let created = 0;
        let skipped = 0;

        for (const occurrence of futureOccurrences) {
          const dateSlug = formatDateSlug(occurrence);
          const instanceSlug = `${baseSlug}-${dateSlug}`;
          if (existingSlugs.has(instanceSlug)) {
            skipped += 1;
            continue;
          }

          const newStart = shiftDate(start, occurrence);
          const newEnd = duration > 0 ? new Date(newStart.getTime() + duration) : undefined;

          const instance: Record<string, unknown> = {
            _type: 'agendaEvent',
            titel: doc.titel,
            slug: { _type: 'slug', current: instanceSlug },
            startDatum: newStart.toISOString(),
            gepubliceerd: doc.gepubliceerd ?? false,
            // Copies are NOT recurring templates themselves (no Generate-button),
            // but we DO carry the frequency forward so the website can show
            // "Elke woensdag" / "Om de 2 weken" / etc. on every instance.
            isHerhalend: false,
            frequentie: doc.frequentie,
            cancelled: false,
          };
          if (newEnd) instance.eindDatum = newEnd.toISOString();
          if (doc.locatie) instance.locatie = doc.locatie;
          if (doc.locatieAnders) instance.locatieAnders = doc.locatieAnders;
          if (doc.categorieRef) instance.categorieRef = doc.categorieRef;
          if (doc.doelgroep) instance.doelgroep = doc.doelgroep;
          if (doc.featured) instance.featured = doc.featured;
          if (doc.prioriteit) instance.prioriteit = doc.prioriteit;
          if (doc.beschrijving) instance.beschrijving = doc.beschrijving;
          if (doc.afbeelding) instance.afbeelding = doc.afbeelding;
          if (doc.onderwerpHub) instance.onderwerpHub = doc.onderwerpHub;

          await client.create(instance);
          created += 1;
        }

        toast.push({
          status: 'success',
          title: `${created} datums aangemaakt`,
          description: skipped > 0
            ? `${skipped} bestaande datums overgeslagen.`
            : `Totaal: ${futureOccurrences.length} volgende datums verwerkt.`,
        });
      } catch (err) {
        toast.push({
          status: 'error',
          title: 'Genereren mislukt',
          description: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setRunning(false);
        onComplete();
      }
    },
  };
};
