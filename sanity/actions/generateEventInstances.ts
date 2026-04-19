import { useState } from 'react';
import { useToast } from '@sanity/ui';
import { RRule, Frequency, Weekday } from 'rrule';
import type { DocumentActionComponent, DocumentActionProps, SanityDocument } from 'sanity';

interface EventSeriesDoc extends SanityDocument {
  titel?: string;
  slug?: { current?: string };
  actief?: boolean;
  frequentie?: 'weekly' | 'biweekly' | 'monthly';
  dagVanDeWeek?: 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';
  dagVanDeMaand?: number;
  startTijd?: string;
  eindTijd?: string;
  startDatum?: string;
  eindDatum?: string;
  locatie?: string;
  locatieAnders?: string;
  categorieRef?: { _ref: string; _type: 'reference' };
  doelgroep?: string;
  gepubliceerd?: boolean;
  beschrijving?: unknown;
  afbeelding?: unknown;
}

const WEEKDAY_MAP: Record<string, Weekday> = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
};

function parseTimeToHM(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':').map(Number);
  return { hour: h, minute: m };
}

function formatDateSlug(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function buildISODate(date: Date, hour: number, minute: number): string {
  const local = new Date(date);
  local.setHours(hour, minute, 0, 0);
  return local.toISOString();
}

export const generateEventInstancesAction: DocumentActionComponent = (props: DocumentActionProps) => {
  const { draft, published, onComplete } = props;
  const [running, setRunning] = useState(false);
  const toast = useToast();

  const doc = (draft || published) as EventSeriesDoc | null;

  const disabled = !doc
    || !doc.titel
    || !doc.slug?.current
    || !doc.frequentie
    || !doc.startTijd
    || !doc.startDatum
    || !doc.eindDatum
    || running;

  return {
    label: running ? 'Bezig met genereren…' : 'Genereer instances',
    icon: () => '🔁',
    disabled,
    onHandle: async () => {
      if (!doc || disabled) {
        onComplete();
        return;
      }

      setRunning(true);
      try {
        const { hour, minute } = parseTimeToHM(doc.startTijd!);
        const endHM = doc.eindTijd ? parseTimeToHM(doc.eindTijd) : null;

        const dtstart = new Date(doc.startDatum!);
        dtstart.setHours(hour, minute, 0, 0);
        const until = new Date(doc.eindDatum!);
        until.setHours(23, 59, 59, 999);

        const freq = doc.frequentie === 'monthly' ? Frequency.MONTHLY : Frequency.WEEKLY;
        const interval = doc.frequentie === 'biweekly' ? 2 : 1;

        const ruleOptions: Parameters<typeof RRule>[0] = {
          freq,
          interval,
          dtstart,
          until,
        };

        if (doc.frequentie !== 'monthly' && doc.dagVanDeWeek) {
          ruleOptions.byweekday = [WEEKDAY_MAP[doc.dagVanDeWeek]];
        }
        if (doc.frequentie === 'monthly' && doc.dagVanDeMaand) {
          ruleOptions.bymonthday = [doc.dagVanDeMaand];
        }

        const rule = new RRule(ruleOptions);
        const occurrences = rule.all();

        if (occurrences.length === 0) {
          toast.push({
            status: 'warning',
            title: 'Geen instances gegenereerd',
            description: 'Controleer de frequentie, dag en datums.',
          });
          return;
        }

        const client = (props as any).getClient
          ? (props as any).getClient({ apiVersion: '2024-01-01' })
          : null;

        if (!client) {
          toast.push({ status: 'error', title: 'Kan geen Sanity-client verkrijgen' });
          return;
        }

        const existing: { slug?: { current?: string } }[] = await client.fetch(
          `*[_type == "agendaEvent" && parentSeries._ref == $seriesId]{ "slug": slug }`,
          { seriesId: doc._id.replace(/^drafts\./, '') }
        );
        const existingSlugs = new Set(
          existing.map((e) => e.slug?.current).filter(Boolean) as string[]
        );

        const baseSlug = doc.slug!.current!;
        const seriesId = doc._id.replace(/^drafts\./, '');

        let created = 0;
        let skipped = 0;

        for (const date of occurrences) {
          const dateSlug = formatDateSlug(date);
          const instanceSlug = `${baseSlug}-${dateSlug}`;
          if (existingSlugs.has(instanceSlug)) {
            skipped += 1;
            continue;
          }

          const startISO = buildISODate(date, hour, minute);
          const eindISO = endHM ? buildISODate(date, endHM.hour, endHM.minute) : undefined;

          const instance: Record<string, unknown> = {
            _type: 'agendaEvent',
            titel: doc.titel,
            slug: { _type: 'slug', current: instanceSlug },
            startDatum: startISO,
            gepubliceerd: doc.gepubliceerd ?? false,
            parentSeries: { _type: 'reference', _ref: seriesId },
          };
          if (eindISO) instance.eindDatum = eindISO;
          if (doc.locatie) instance.locatie = doc.locatie;
          if (doc.locatieAnders) instance.locatieAnders = doc.locatieAnders;
          if (doc.categorieRef) instance.categorieRef = doc.categorieRef;
          if (doc.doelgroep) instance.doelgroep = doc.doelgroep;
          if (doc.beschrijving) instance.beschrijving = doc.beschrijving;
          if (doc.afbeelding) instance.afbeelding = doc.afbeelding;

          await client.create(instance);
          created += 1;
        }

        toast.push({
          status: 'success',
          title: `${created} instances aangemaakt`,
          description: skipped > 0
            ? `${skipped} bestaande instances overgeslagen.`
            : `Totaal: ${occurrences.length} datums verwerkt.`,
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
