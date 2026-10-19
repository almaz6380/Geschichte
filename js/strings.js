// Sammelt die Oberflächentexte aller Sprachen. Deutsch ist die Referenz,
// fehlende Schlüssel einer Sprache fallen dorthin zurück (siehe js/i18n.js).
import de from './strings/de.js';
import en from './strings/en.js';
import fr from './strings/fr.js';
import es from './strings/es.js';
import it from './strings/it.js';
import pt from './strings/pt.js';
import ru from './strings/ru.js';
import ja from './strings/ja.js';
import zh from './strings/zh.js';

export const STRINGS = { de, en, fr, es, it, pt, ru, ja, zh };
