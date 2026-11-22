// Bitte um eine Store-Bewertung (seit 1.5.1).
//
// Ohne Gegenleistung: Apple (5.6.1) und Google verbieten, eine Bewertung an eine Belohnung zu
// koppeln oder das Ergebnis abzufragen. Ob der Dialog wirklich erscheint, entscheidet das
// System (iOS höchstens dreimal im Jahr) und meldet nichts zurück.
//
// Wann gefragt wird, ist unsere Sache:
//  - erst ab der FÜNFTEN beendeten Runde (Quiz, Duell, Spiel, Karten) – wer so weit kommt, mag die App;
//  - danach höchstens alle 90 Tage (eigene Bremse, weil wir nicht erfahren, ob er erschien);
//  - NIE im selben Moment wie eine Vollbildanzeige;
//  - nur in der Store-App, im Browser gibt es keinen Store.
// Die Regel ist eine reine Funktion (darfBewertungFragen), geprüft in test/review.test.mjs.

export const AB_RUNDE = 5;
export const ABSTAND_MS = 90 * 24 * 60 * 60 * 1000;
const SCHLUESSEL = 'wg.review';

export function darfBewertungFragen(stand, jetzt, vollbildGerade) {
  if (vollbildGerade) return false;
  if (stand.runden < AB_RUNDE) return false;
  if (stand.zuletzt > 0 && jetzt - stand.zuletzt < ABSTAND_MS) return false;
  return true;
}

function lade() {
  try {
    const o = JSON.parse(localStorage.getItem(SCHLUESSEL) || '{}');
    return {
      runden: Number.isFinite(o.runden) ? Math.max(0, Math.trunc(o.runden)) : 0,
      zuletzt: Number.isFinite(o.zuletzt) ? Math.max(0, o.zuletzt) : 0,
    };
  } catch {
    return { runden: 0, zuletzt: 0 };
  }
}

function speichere(stand) {
  try { localStorage.setItem(SCHLUESSEL, JSON.stringify(stand)); } catch { /* dann wird nie gefragt */ }
}

// Nach jedem Rundenende aufrufen (aus ads.js roundFinished), mit der Angabe, ob gerade
// eine Vollbildanzeige kam.
export function rundeBeendet(vollbildGerade) {
  const stand = lade();
  stand.runden += 1;
  const jetzt = Date.now();
  const nativ = !!globalThis.window?.Capacitor?.isNativePlatform?.();
  const plugin = globalThis.window?.Capacitor?.Plugins?.InAppReview;
  const fragen = nativ && !!plugin && darfBewertungFragen(stand, jetzt, vollbildGerade);
  if (fragen) stand.zuletzt = jetzt;
  speichere(stand);
  if (!fragen) return;
  // Erst wenn das Ergebnis steht, nicht mitten in den Wechsel hinein.
  setTimeout(() => { plugin.requestReview().catch(() => {}); }, 1500);
}
