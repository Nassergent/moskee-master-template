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

// ── Nieuws & Blog met Aan/Uit secties ──
function nieuwsManagement(S: StructureBuilder) {
  return S.listItem()
    .title('Nieuws & Blog')
    .icon(() => '📰')
    .child(
      S.list()
        .title('Nieuws & Blog')
        .items([
          S.listItem()
            .title('🟢 Gepubliceerd')
            .icon(() => '🟢')
            .child(
              S.documentList()
                .title('Gepubliceerde berichten')
                .schemaType('post')
                .filter('_type == "post" && gepubliceerd == true')
                .defaultOrdering([{ field: 'datum', direction: 'desc' }])
            ),
          S.listItem()
            .title('⚫ Concept / Uitgeschakeld')
            .icon(() => '⚫')
            .child(
              S.documentList()
                .title('Concepten')
                .schemaType('post')
                .filter('_type == "post" && gepubliceerd != true')
                .defaultOrdering([{ field: 'datum', direction: 'desc' }])
            ),
          S.divider(),
          S.listItem()
            .title('Alle berichten')
            .icon(() => '📰')
            .child(
              S.documentTypeList('post')
                .title('Alle berichten')
                .defaultOrdering([{ field: 'datum', direction: 'desc' }])
            ),
        ])
    );
}

// ── Diensten met Aan/Uit secties ──
function dienstenManagement(S: StructureBuilder) {
  return S.listItem()
    .title('Diensten')
    .icon(() => '🕌')
    .child(
      S.list()
        .title('Diensten')
        .items([
          S.listItem()
            .title('🟢 Actief op website')
            .icon(() => '🟢')
            .child(
              S.documentList()
                .title('Actieve diensten')
                .schemaType('service')
                .filter('_type == "service" && actief != false')
                .defaultOrdering([{ field: 'volgorde', direction: 'asc' }])
            ),
          S.listItem()
            .title('⚫ Uitgeschakeld')
            .icon(() => '⚫')
            .child(
              S.documentList()
                .title('Uitgeschakelde diensten')
                .schemaType('service')
                .filter('_type == "service" && actief == false')
                .defaultOrdering([{ field: 'volgorde', direction: 'asc' }])
            ),
          S.divider(),
          S.listItem()
            .title('Alle diensten')
            .icon(() => '🕌')
            .child(
              S.documentTypeList('service')
                .title('Alle diensten')
                .defaultOrdering([{ field: 'volgorde', direction: 'asc' }])
            ),
        ])
    );
}

// ── Islamitische Citaten met Aan/Uit secties ──
function quoteManagement(S: StructureBuilder) {
  return S.listItem()
    .title('Islamitische Citaten')
    .icon(() => '✨')
    .child(
      S.list()
        .title('Islamitische Citaten')
        .items([
          S.listItem()
            .title('🟢 Actief op website')
            .icon(() => '🟢')
            .child(
              S.documentList()
                .title('Actieve citaten')
                .schemaType('quote')
                .filter('_type == "quote" && actief == true')
                .defaultOrdering([{ field: 'bron', direction: 'asc' }])
            ),
          S.listItem()
            .title('⚫ Uitgeschakeld')
            .icon(() => '⚫')
            .child(
              S.documentList()
                .title('Uitgeschakelde citaten')
                .schemaType('quote')
                .filter('_type == "quote" && actief != true')
                .defaultOrdering([{ field: 'bron', direction: 'asc' }])
            ),
          S.divider(),
          S.listItem()
            .title('Alle citaten')
            .icon(() => '✨')
            .child(
              S.documentTypeList('quote')
                .title('Alle citaten')
                .defaultOrdering([{ field: 'bron', direction: 'asc' }])
            ),
        ])
    );
}

// ── Moskee-etiketten met Aan/Uit secties ──
function etiquetteManagement(S: StructureBuilder) {
  return S.listItem()
    .title('Moskee-etiketten')
    .icon(() => '📋')
    .child(
      S.list()
        .title('Moskee-etiketten')
        .items([
          S.listItem()
            .title('🟢 Actief op website')
            .icon(() => '🟢')
            .child(
              S.documentList()
                .title('Actieve etiketten')
                .schemaType('etiquette')
                .filter('_type == "etiquette" && isPublished != false')
                .defaultOrdering([{ field: 'volgorde', direction: 'asc' }])
            ),
          S.listItem()
            .title('⚫ Uitgeschakeld')
            .icon(() => '⚫')
            .child(
              S.documentList()
                .title('Uitgeschakelde etiketten')
                .schemaType('etiquette')
                .filter('_type == "etiquette" && isPublished == false')
                .defaultOrdering([{ field: 'volgorde', direction: 'asc' }])
            ),
          S.divider(),
          S.listItem()
            .title('Alle etiketten')
            .icon(() => '📋')
            .child(
              S.documentTypeList('etiquette')
                .title('Alle etiketten')
                .defaultOrdering([{ field: 'volgorde', direction: 'asc' }])
            ),
        ])
    );
}

// ── Projecten met Aan/Uit secties ──
function projectenManagement(S: StructureBuilder) {
  return S.listItem()
    .title('Projecten')
    .icon(() => '🏗️')
    .child(
      S.list()
        .title('Projecten')
        .items([
          S.listItem()
            .title('🟢 Actief op website')
            .icon(() => '🟢')
            .child(
              S.documentList()
                .title('Actieve projecten')
                .schemaType('project')
                .filter('_type == "project" && actief == true')
                .defaultOrdering([{ field: '_createdAt', direction: 'desc' }])
            ),
          S.listItem()
            .title('⚫ Uitgeschakeld')
            .icon(() => '⚫')
            .child(
              S.documentList()
                .title('Uitgeschakelde projecten')
                .schemaType('project')
                .filter('_type == "project" && actief != true')
                .defaultOrdering([{ field: '_createdAt', direction: 'desc' }])
            ),
          S.divider(),
          S.listItem()
            .title('Alle projecten')
            .icon(() => '🏗️')
            .child(
              S.documentTypeList('project')
                .title('Alle projecten')
                .defaultOrdering([{ field: '_createdAt', direction: 'desc' }])
            ),
        ])
    );
}

// ── Agenda met Aan/Uit secties ──
function agendaManagement(S: StructureBuilder) {
  return S.listItem()
    .title('Agenda')
    .icon(() => '📅')
    .child(
      S.list()
        .title('Agenda')
        .items([
          S.listItem()
            .title('🟢 Actief op website')
            .icon(() => '🟢')
            .child(
              S.documentList()
                .title('Gepubliceerde evenementen')
                .schemaType('agendaEvent')
                .filter('_type == "agendaEvent" && gepubliceerd == true')
                .defaultOrdering([{ field: 'startDatum', direction: 'asc' }])
            ),
          S.listItem()
            .title('⚫ Uitgeschakeld')
            .icon(() => '⚫')
            .child(
              S.documentList()
                .title('Uitgeschakelde evenementen')
                .schemaType('agendaEvent')
                .filter('_type == "agendaEvent" && gepubliceerd != true')
                .defaultOrdering([{ field: 'startDatum', direction: 'asc' }])
            ),
          S.divider(),
          S.listItem()
            .title('Alle evenementen')
            .icon(() => '📅')
            .child(
              S.documentTypeList('agendaEvent')
                .title('Alle evenementen')
                .defaultOrdering([{ field: 'startDatum', direction: 'asc' }])
            ),
        ])
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

      dienstenManagement(S),
      projectenManagement(S),
      nieuwsManagement(S),
      agendaManagement(S),

      S.divider(),

      singleton(S, 'aboutPage', 'Over Ons', '📜'),
      singleton(S, 'contactPage', 'Contact', '📞'),

      S.divider(),

      quoteManagement(S),
      etiquetteManagement(S),
      volunteerManagement(S),
    ]);
}

export const newDocumentOptions = (prev: any[]) =>
  prev.filter((item: any) => !singletonTypes.includes(item.templateId));
