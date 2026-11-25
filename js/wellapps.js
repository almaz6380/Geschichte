// „Mehr von WellApps“: Querverweise auf die anderen Apps desselben Studios.
// Reine Daten und Link-Regel, ohne DOM – gezeichnet wird in js/views/more.js.
//
// ⚠ Diese Tabelle wird in allen sieben Apps gleich gepflegt (gleiche Reihenfolge,
// gleiche Store-IDs). Neue App: Zeile hier ergänzen, Symbol (144×144 WebP) nach
// icons/apps/<id>.webp legen, in sw.js in PRECACHE eintragen und die Kurzzeile
// „wellapps.sub.<id>“ in ALLEN Sprachdateien unter js/strings/ anlegen.
//
// Kein Tracking, kein Werbenetz: Es sind gewöhnliche Links in den Store.

export const OWN_APP = 'weltgeschichte';

// name: Anzeigename, wird nicht übersetzt. sub: Schlüssel der Kurzzeile.
export const WELLAPPS = [
  { id: 'mahjong', name: 'Mahjong Royale', ios: '6787721454', android: 'com.mahjongroyale.app', sub: 'wellapps.sub.mahjong' },
  { id: 'fixthemix', name: 'FixTheMix', ios: '6818787934', android: 'at.gallab.fixthemix', sub: 'wellapps.sub.fixthemix' },
  { id: 'anigosha', name: 'Anigosha', ios: '6797757350', android: 'at.gallab.animequiz', sub: 'wellapps.sub.anigosha' },
  { id: 'swaply', name: 'Swaply', ios: '6787695557', android: 'at.gallab.swaply', sub: 'wellapps.sub.swaply' },
  // Die eigene App steht der Vollständigkeit halber in der Tabelle und wird nie gezeigt.
  { id: 'weltgeschichte', name: 'Weltgeschichte', ios: '6811862606', android: 'de.almaz.weltgeschichte', sub: null },
  { id: 'watten', name: 'Watten & Schnapsen', ios: '6800774882', android: 'at.doppeldeutsch.karten', sub: 'wellapps.sub.watten' },
  { id: 'fullrep', name: 'FullRep', ios: '6788461300', android: 'at.gallab.mypeak', sub: 'wellapps.sub.fullrep' },
];

export function otherApps() {
  return WELLAPPS.filter((a) => a.id !== OWN_APP);
}

// iOS: native App oder iPhone/iPad-Browser. iPadOS meldet sich als „MacIntel“ mit Touch.
export function isIos(env = globalThis) {
  const platform = env.Capacitor?.getPlatform?.();
  if (platform === 'ios') return true;
  if (platform === 'android') return false;
  const nav = env.navigator || {};
  return /iPhone|iPad|iPod/.test(nav.userAgent || '') || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
}

export function storeUrl(app, ios = isIos()) {
  return ios
    ? `https://apps.apple.com/app/id${app.ios}`
    : `https://play.google.com/store/apps/details?id=${app.android}`;
}
