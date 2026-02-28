import { settings } from './schemas/settings';
import { prayerTimes } from './schemas/prayerTimes';
import { service } from './schemas/service';
import { project } from './schemas/project';
import { post } from './schemas/post';
import { etiquette } from './schemas/etiquette';
import { quote } from './schemas/quote';
import { homePage } from './schemas/homePage';
import { homeCards } from './schemas/homeCards';
import { aboutPage } from './schemas/aboutPage';
import { contactPage } from './schemas/contactPage';
import { volunteer } from './schemas/volunteer';
import { eventRegistration } from './schemas/eventRegistration';
import { eventCategorie } from './schemas/eventCategorie';
import { agendaEvent } from './schemas/agendaEvent';
import { lessonProgram } from './schemas/lessonProgram';
import { ramadanOverride } from './schemas/ramadanOverride';
import { janazahProcedure } from './schemas/janazahProcedure';
import { janazahAlert } from './schemas/janazahAlert';

export const schema = {
  types: [
    settings,
    homePage,
    homeCards,
    prayerTimes,
    service,
    project,
    post,
    eventCategorie,
    agendaEvent,
    lessonProgram,
    ramadanOverride,
    janazahProcedure,
    janazahAlert,
    aboutPage,
    contactPage,
    quote,
    etiquette,
    volunteer,
    eventRegistration,
  ],
};
