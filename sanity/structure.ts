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

// ── Dynamische Vrijwilligers Beheer ──
// Haalt taken op uit settings.volunteerTasks en maakt per taak een gefilterde lijst
function volunteerManagement(S: StructureBuilder) {
  return S.listItem()
    .title('Vrijwilligers Beheer')
    .icon(() => '👥')
    .child(
      S.list()
        .title('Vrijwilligers Beheer')
        .items([
          // 1. Alle aanmeldingen
          S.listItem()
            .title('Alle Aanmeldingen')
            .icon(() => '📋')
            .child(
              S.documentTypeList('volunteer')
                .title('Alle Vrijwilligers')
                .defaultOrdering([{ field: 'aanmeldDatum', direction: 'desc' }])
            ),

          // 2. Per status
          S.listItem()
            .title('Op Status')
            .icon(() => '🏷️')
            .child(
              S.list()
                .title('Filter op Status')
                .items([
                  statusFilter(S, 'nieuw', '🆕 Nieuwe Aanmeldingen'),
                  statusFilter(S, 'gecontacteerd', '📞 Gecontacteerd'),
                  statusFilter(S, 'actief', '✅ Actief'),
                  statusFilter(S, 'inactief', '❌ Inactief'),
                ])
            ),

          S.divider(),

          // 3. Gecategoriseerd op Taak — dynamisch uit settings
          S.listItem()
            .title('Gecategoriseerd op Taak')
            .icon(() => '📂')
            .child(async () => {
              // Haal de taken op uit Sanity settings
              const client = S.context.getClient({ apiVersion: '2024-01-01' });
              const settings = await client.fetch(
                `*[_id == "settings"][0].volunteerTasks`
              );
              const tasks: string[] = Array.isArray(settings) && settings.length > 0
                ? settings
                : ['Koken', 'Kuisen', 'Onderhoud', 'Evenementen', 'Educatie', 'Administratie'];

              return S.list()
                .title('Taken')
                .items(
                  tasks.map((task) =>
                    S.listItem()
                      .title(task)
                      .icon(() => '👤')
                      .child(
                        S.documentList()
                          .title(`Vrijwilligers: ${task}`)
                          .schemaType('volunteer')
                          .filter(`_type == "volunteer" && $task in taken`)
                          .params({ task: task.toLowerCase() })
                          .defaultOrdering([{ field: 'aanmeldDatum', direction: 'desc' }])
                      )
                  )
                );
            }),
        ])
    );
}

function statusFilter(S: StructureBuilder, status: string, title: string) {
  return S.listItem()
    .title(title)
    .child(
      S.documentList()
        .title(title)
        .schemaType('volunteer')
        .filter(`_type == "volunteer" && status == $status`)
        .params({ status })
        .defaultOrdering([{ field: 'aanmeldDatum', direction: 'desc' }])
    );
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
      volunteerManagement(S),
    ]);
}

export const newDocumentOptions = (prev: any[]) =>
  prev.filter((item: any) => !singletonTypes.includes(item.templateId));
