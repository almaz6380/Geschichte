// Sprachverwaltung und Oberflächentexte.
// Die Inhalte liegen je Sprache unter data/<code>/; die IDs sind in allen Sprachen gleich,
// damit Lesezeichen, Quiz-Fortschritt und Links beim Sprachwechsel gültig bleiben.
import { STRINGS } from './strings.js';

// ready: Oberfläche und Inhalte sind vollständig übersetzt und werden zur Auswahl angeboten.
export const LANGS = [
  { code: 'de', name: 'Deutsch', locale: 'de-DE', ready: true },
  { code: 'en', name: 'English', locale: 'en-US', ready: true },
  { code: 'fr', name: 'Français', locale: 'fr-FR', ready: false },
  { code: 'es', name: 'Español', locale: 'es-ES', ready: false },
  { code: 'it', name: 'Italiano', locale: 'it-IT', ready: false },
  { code: 'pt', name: 'Português', locale: 'pt-PT', ready: false },
];

export const DEFAULT_LANG = 'de';
export const LANG_CODES = LANGS.map((l) => l.code);
export const READY_LANGS = LANGS.filter((l) => l.ready);
export const READY_CODES = READY_LANGS.map((l) => l.code);

let current = DEFAULT_LANG;

export function getLang() { return current; }
export function langInfo(code = current) { return LANGS.find((l) => l.code === code) || LANGS[0]; }
export function getLocale(code = current) { return langInfo(code).locale; }

export function setLang(code) {
  current = LANG_CODES.includes(code) ? code : DEFAULT_LANG;
  if (typeof document !== 'undefined') document.documentElement.lang = current;
  return current;
}

// Sprache des Geräts, sofern sie fertig übersetzt ist.
export function detectLang(navLangs) {
  const list = navLangs || (typeof navigator === 'undefined' ? [] : navigator.languages || [navigator.language]);
  for (const raw of list) {
    const code = String(raw || '').slice(0, 2).toLowerCase();
    if (READY_CODES.includes(code)) return code;
  }
  return DEFAULT_LANG;
}

// Ordnungszahl für Jahrhundert-Angaben: deutsch "5.", englisch "5th".
const ORDINAL = {
  de: (n) => `${n}.`,
  en: (n) => {
    const rest100 = n % 100;
    if (rest100 >= 11 && rest100 <= 13) return `${n}th`;
    return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'}`;
  },
};

export function ordinal(n, code = current) {
  return (ORDINAL[code] || ORDINAL[DEFAULT_LANG])(n);
}

// Text nachschlagen. Fehlt ein Eintrag, greift Deutsch als Rückfallebene.
export function t(key, vars) {
  const dict = STRINGS[current] || {};
  let s = dict[key];
  if (s === undefined) s = STRINGS[DEFAULT_LANG][key];
  if (s === undefined) return key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

// Zählbare Angabe, z. B. plural(3, 'unit.event') -> "3 Ereignisse".
export function plural(n, key) {
  return `${n} ${t(`${key}.${n === 1 ? 'one' : 'other'}`)}`;
}

export function compare(a, b) {
  return String(a).localeCompare(String(b), getLocale());
}
