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
  { code: 'pt', name: 'Português', locale: 'pt-BR', ready: false },
  { code: 'it', name: 'Italiano', locale: 'it-IT', ready: true },
  { code: 'tr', name: 'Türkçe', locale: 'tr-TR', ready: false },
  { code: 'pl', name: 'Polski', locale: 'pl-PL', ready: false },
  { code: 'ru', name: 'Русский', locale: 'ru-RU', ready: false },
  { code: 'uk', name: 'Українська', locale: 'uk-UA', ready: false },
  { code: 'ar', name: 'العربية', locale: 'ar-u-nu-latn', dir: 'rtl', ready: true },
  { code: 'hi', name: 'हिन्दी', locale: 'hi-IN-u-nu-latn', ready: false },
  { code: 'zh', name: '中文', locale: 'zh-CN', ready: false },
  { code: 'ja', name: '日本語', locale: 'ja-JP', ready: false },
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
  if (typeof document !== 'undefined') {
    document.documentElement.lang = current;
    document.documentElement.dir = langInfo(current).dir || 'ltr';
  }
  return current;
}

export function isRtl(code = current) { return langInfo(code).dir === 'rtl'; }

// Sprache des Geräts, sofern sie fertig übersetzt ist.
export function detectLang(navLangs) {
  const list = navLangs || (typeof navigator === 'undefined' ? [] : navigator.languages || [navigator.language]);
  for (const raw of list) {
    const code = String(raw || '').slice(0, 2).toLowerCase();
    if (READY_CODES.includes(code)) return code;
  }
  return DEFAULT_LANG;
}

// Ordnungszahl für Jahrhundert-Angaben, so wie die jeweilige Sprache sie schreibt:
// deutsch "5.", englisch "5th", französisch "Ve", romanische/slawische Sprachen römisch "V",
// Arabisch, Hindi, Chinesisch und Japanisch schlicht "5".
function roman(n) {
  const map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, r] of map) while (n >= v) { out += r; n -= v; }
  return out;
}
const ORDINAL = {
  de: (n) => `${n}.`,
  tr: (n) => `${n}.`,
  en: (n) => {
    const rest100 = n % 100;
    if (rest100 >= 11 && rest100 <= 13) return `${n}th`;
    return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'}`;
  },
  fr: (n) => (n === 1 ? 'Ier' : `${roman(n)}e`),
  es: roman, pt: roman, it: roman, pl: roman, ru: roman, uk: roman,
  ar: (n) => String(n), hi: (n) => String(n), zh: (n) => String(n), ja: (n) => String(n),
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

// Zählbare Angabe, z. B. plural(3, 'unit.event') -> "3 Ereignisse". Die Pluralform richtet
// sich nach den Regeln der Sprache (Intl.PluralRules: one, two, few, many, other, zero);
// fehlt eine Form, gilt "other".
const pluralRules = new Map();
function pluralCategory(n) {
  const loc = getLocale();
  if (!pluralRules.has(loc)) pluralRules.set(loc, new Intl.PluralRules(loc));
  return pluralRules.get(loc).select(n);
}
function hasKey(key) {
  const dict = STRINGS[current] || {};
  return dict[key] !== undefined;
}
export function plural(n, key) {
  const cat = pluralCategory(n);
  for (const k of [`${key}.${cat}`, `${key}.other`]) if (hasKey(k)) return `${n} ${t(k)}`;
  return `${n} ${t(`${key}.${n === 1 ? 'one' : 'other'}`)}`; // Rückfall auf Deutsch
}

export function compare(a, b) {
  return String(a).localeCompare(String(b), getLocale());
}
