// Sprachverwaltung und Oberflächentexte.
// Die Inhalte liegen je Sprache unter data/<code>/; die IDs sind in allen Sprachen gleich,
// damit Lesezeichen, Quiz-Fortschritt und Links beim Sprachwechsel gültig bleiben.
import { STRINGS } from './strings.js';

// ready: Oberfläche und Inhalte sind vollständig übersetzt und werden zur Auswahl angeboten.
export const LANGS = [
  { code: 'de', name: 'Deutsch', locale: 'de-DE', ready: true },
  { code: 'en', name: 'English', locale: 'en-US', ready: true },
  { code: 'fr', name: 'Français', locale: 'fr-FR', ready: true },
  { code: 'es', name: 'Español', locale: 'es-ES', ready: true },
  { code: 'it', name: 'Italiano', locale: 'it-IT', ready: true },
  { code: 'pt', name: 'Português', locale: 'pt-BR', ready: true },
  { code: 'ru', name: 'Русский', locale: 'ru-RU', ready: true },
  { code: 'ja', name: '日本語', locale: 'ja-JP', ready: true },
  { code: 'zh', name: '中文', locale: 'zh-CN', ready: true },
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

// Sprache des Geräts, sofern sie fertig übersetzt ist; sonst Englisch.
// DEFAULT_LANG bleibt Deutsch (Quelle der Texte, Rückfall für fehlende Schlüssel),
// aber ein Gerät auf Italienisch oder Japanisch versteht Englisch eher als Deutsch.
export const FALLBACK_LANG = 'en';
export function detectLang(navLangs) {
  const list = navLangs || (typeof navigator === 'undefined' ? [] : navigator.languages || [navigator.language]);
  for (const raw of list) {
    const code = String(raw || '').slice(0, 2).toLowerCase();
    if (READY_CODES.includes(code)) return code;
  }
  return READY_CODES.includes(FALLBACK_LANG) ? FALLBACK_LANG : DEFAULT_LANG;
}

// Jahrhunderte werden in den romanischen Sprachen römisch geschrieben (siglo V, Ve siècle).
function roman(n) {
  const map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, r] of map) while (n >= v) { out += r; n -= v; }
  return out;
}

// Ordnungszahl für Jahrhundert-Angaben: deutsch "5.", englisch "5th", französisch "Ve", sonst "V".
const ORDINAL = {
  fr: (n) => `${roman(n)}${n === 1 ? 'er' : 'e'}`,
  es: roman,
  it: roman,
  pt: roman,
  ru: roman,
  // Chinesisch und Japanisch zählen Jahrhunderte mit arabischen Ziffern (5世纪 / 5世紀).
  zh: (n) => String(n),
  ja: (n) => String(n),
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
// Die Form kommt aus den Pluralregeln der Sprache: Russisch kennt one/few/many
// (1 событие, 2 события, 5 событий); fehlt eine Form, gilt *.other.
export function plural(n, key) {
  let cat = n === 1 ? 'one' : 'other';
  try { cat = new Intl.PluralRules(getLocale()).select(n); } catch { /* alte Engine */ }
  const dict = STRINGS[current] || {};
  const form = dict[`${key}.${cat}`] !== undefined ? cat : (cat === 'one' ? 'one' : 'other');
  return `${n} ${t(`${key}.${form}`)}`;
}

export function compare(a, b) {
  return String(a).localeCompare(String(b), getLocale());
}
