import type { StructureBuilder } from 'sanity/structure';

// Singleton types — no "+" button, single document only
const singletonTypes = ['settings', 'homePage', 'prayerTimes', 'aboutPage', 'contactPage'];

function singleton(S: StructureBuilder, typeName: string, title: string, icon: string) {
  return S.listItem()
    .title(title)
    .icon(() => icon)
    .child(
      S.document()
        .schemaType(typeName)
        .documentId(typeName)
        .title(title)
    );
}

function collection(S: StructureBuilder, typeName: string, title: string, icon: string, ordering?: { field: string; direction: 'asc' | 'desc' }) {
  const list = S.documentTypeList(typeName).title(title);
  if (ordering) {
    list.defaultOrdering([{ field: ordering.field, direction: ordering.direction }]);
  }
  return S.listItem()
    .title(title)
    .icon(() => icon)
    .child(list);
}

// ── DE GOUDEN LIJST ──
export function structure(S: StructureBuilder) {
  return S.list()
    .title('Inhoud')
    .items([
      singleton(S, 'settings', 'Site Instellingen', '⚙️'),
      singleton(S, 'homePage', 'Home Pagina', '🏠'),
      singleton(S, 'prayerTimes', 'Gebedstijden', '🕒'),

      S.divider(),

      collection(S, 'service', 'Diensten', '🕌', { field: 'volgorde', direction: 'asc' }),
      collection(S, 'project', 'Projecten', '🏗️', { field: '_createdAt', direction: 'desc' }),
      collection(S, 'post', 'Nieuws & Blog', '📰', { field: 'datum', direction: 'desc' }),
      collection(S, 'agendaEvent', 'Agenda', '📅', { field: 'startDatum', direction: 'asc' }),

      S.divider(),

      singleton(S, 'aboutPage', 'Over Ons', '📜'),
      singleton(S, 'contactPage', 'Contact', '📞'),

      S.divider(),

      collection(S, 'quote', 'Islamitische Citaten', '✨', { field: 'bron', direction: 'asc' }),
      collection(S, 'etiquette', 'Moskee-etiketten', '📋', { field: 'volgorde', direction: 'asc' }),
      collection(S, 'volunteer', 'Vrijwilligers', '👥', { field: 'aanmeldDatum', direction: 'desc' }),
    ]);
}

export const newDocumentOptions = (prev: any[]) =>
  prev.filter((item: any) => !singletonTypes.includes(item.templateId));
