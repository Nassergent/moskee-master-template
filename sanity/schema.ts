import { settings } from './schemas/settings';
import { prayerTimes } from './schemas/prayerTimes';
import { service } from './schemas/service';
import { project } from './schemas/project';
import { post } from './schemas/post';
import { etiquette } from './schemas/etiquette';
import { quote } from './schemas/quote';
import { homePage } from './schemas/homePage';
import { aboutPage } from './schemas/aboutPage';
import { contactPage } from './schemas/contactPage';
import { volunteer } from './schemas/volunteer';
import { agendaEvent } from './schemas/agendaEvent';
import { lessonProgram } from './schemas/lessonProgram';
import { ramadanOverride } from './schemas/ramadanOverride';

export const schema = {
  types: [
    settings,
    homePage,
    prayerTimes,
    service,
    project,
    post,
    agendaEvent,
    lessonProgram,
    ramadanOverride,
    aboutPage,
    contactPage,
    quote,
    etiquette,
    volunteer,
  ],
};
