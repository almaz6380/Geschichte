// Werbung: AdMob in den Apps (Banner, Vollbild nach einer Runde, belohntes Video für den
// 50:50-Joker), AdSense in der Web-Fassung. Ein Format ohne eingetragene ID bleibt aus.
//
// ⚠ Solange USE_TEST_ADS = true ist, zeigen die Apps Googles Testanzeigen. Echte Anzeigen
// während der Entwicklung selbst anzutippen ist ein Richtlinienverstoß und kann das
// AdMob-Konto sperren — auch das der Mahjong-App, es ist dasselbe Konto.
// Die App-IDs (nicht die Block-IDs) stehen zusätzlich nativ: android/app/src/main/AndroidManifest.xml
// und ios/App/App/Info.plist (GADApplicationIdentifier). Übersicht: docs/WERBUNG.md.
import { showToast, esc } from './ui.js';
import { t } from './i18n.js';

const USE_TEST_ADS = true;

// Googles öffentliche Test-Anzeigenblöcke.
const TEST = {
  android: {
    banner: 'ca-app-pub-3940256099942544/9214589741',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
  },
  ios: {
    banner: 'ca-app-pub-3940256099942544/2435281174',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
  },
};

// Anzeigenblöcke der App „Weltgeschichte“ im AdMob-Konto pub-8860791993288062.
const PROD = {
  android: { banner: '', interstitial: '', rewarded: '' },
  ios: { banner: '', interstitial: '', rewarded: '' },
};

// Web-Fassung (AdSense). Leer = keine Werbung im Web.
const ADSENSE_CLIENT = ''; // 'ca-pub-8860791993288062'
const ADSENSE_SLOT = ''; // Anzeigenblock „Weltgeschichte unten“

// Vollbildwerbung: frühestens nach der zweiten Runde, danach höchstens alle 3 Minuten.
const INTERSTITIAL_FIRST_ROUND = 2;
const INTERSTITIAL_GAP_MS = 180_000;
// Web: ein neuer Anzeigenblock beim Seitenwechsel höchstens jede Minute.
const WEB_REFRESH_MS = 60_000;

// Keine Banner, wo gespielt wird: Fehltipps neben Antwortknöpfen wertet Google als
// ungültige Klicks (so ist es bei der Mahjong-App passiert).
const PLAY_ROUTES = new Set(['duell', 'spiel', 'wer-bin-ich', 'taeglich', 'karten']);
export function bannerAllowed(path) {
  return !(PLAY_ROUTES.has(path[0]) || (path[0] === 'quiz' && path[1]));
}

const AdMob = () => window.Capacitor?.Plugins?.AdMob;
const platform = () => (window.Capacitor?.getPlatform?.() === 'ios' ? 'ios' : 'android');
const isNative = () => !!window.Capacitor?.isNativePlatform?.();
const ids = () => (USE_TEST_ADS ? TEST : PROD)[platform()];

let ready = false;
let privacyOptions = false;
// Native Aufrufe nacheinander, sonst überholt ein hideBanner ein noch laufendes showBanner.
let chain = Promise.resolve();
const queue = (fn) => (chain = chain.then(fn).catch((e) => console.warn('Werbung:', e)));

function setBannerHeight(px) {
  document.documentElement.style.setProperty('--ad-h', `${Math.max(0, Math.round(px))}px`);
  document.documentElement.classList.toggle('has-banner', px > 0);
}

// ---------- Start ----------

export async function initAds() {
  if (isNative()) return initNative();
  if (ADSENSE_CLIENT && /^https?:$/.test(location.protocol)) initWeb();
}

async function initNative() {
  const ad = AdMob();
  if (!ad) return;
  // DSGVO-Einwilligung (Google UMP). Die Nachricht selbst wird in AdMob unter
  // „Datenschutz und Mitteilungen“ angelegt; ohne sie meldet UMP NOT_REQUIRED.
  try {
    const info = await ad.requestConsentInfo();
    if (info.isConsentFormAvailable && info.status === 'REQUIRED') await ad.showConsentForm();
    const after = await ad.requestConsentInfo();
    privacyOptions = after.privacyOptionsRequirementStatus === 'REQUIRED';
  } catch (e) {
    // Kein Netz o. Ä.: UMP fragt beim nächsten Start erneut.
    console.warn('Einwilligung fehlgeschlagen:', e);
  }
  // iOS: Die Tracking-Abfrage (ATT) stellt der AppDelegate selbst, kurz nach dem Start.
  // Hier nur auf die Antwort warten, damit die erste Anzeige sie schon kennt.
  if (platform() === 'ios') await waitForTracking(ad);
  try {
    await ad.initialize({ initializeForTesting: USE_TEST_ADS });
  } catch (e) {
    console.warn('AdMob-Start fehlgeschlagen:', e);
    return;
  }
  ready = true;
  await listenBanner(ad);
  // Die nächste Vollbildanzeige erst laden, wenn die vorige zu ist.
  await ad.addListener('interstitialAdDismissed', prepareInterstitial);
  await ad.addListener('interstitialAdFailedToShow', prepareInterstitial);
  prepareInterstitial();
  if (wantBanner) updateBanner();
}

async function waitForTracking(ad) {
  const until = Date.now() + 20_000;
  try {
    while (Date.now() < until) {
      const { status } = await ad.trackingAuthorizationStatus();
      if (status !== 'notDetermined') return;
      await new Promise((r) => setTimeout(r, 250));
    }
  } catch { /* älteres iOS ohne ATT */ }
}

// ---------- Banner ----------

let wantBanner = false;
let bannerState = 'none'; // none | shown | hidden
let bannerHeight = 0;

async function listenBanner(ad) {
  await ad.addListener('bannerAdSizeChanged', (size) => {
    bannerHeight = size?.height || 0;
    if (bannerState === 'shown') setBannerHeight(bannerHeight);
  });
  await ad.addListener('bannerAdFailedToLoad', () => { bannerHeight = 0; setBannerHeight(0); });
}

// Vom Router bei jedem Seitenwechsel aufgerufen.
export function onRoute(path) {
  wantBanner = bannerAllowed(path);
  if (isNative()) updateBanner();
  else if (webReady) updateWebAd();
}

function updateBanner() {
  if (!ready || !ids().banner) return;
  queue(async () => {
    const ad = AdMob();
    if (wantBanner && bannerState === 'none') {
      await ad.showBanner({ adId: ids().banner, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', isTesting: USE_TEST_ADS });
      bannerState = 'shown';
    } else if (wantBanner && bannerState === 'hidden') {
      await ad.resumeBanner();
      bannerState = 'shown';
      setBannerHeight(bannerHeight);
    } else if (!wantBanner && bannerState === 'shown') {
      setBannerHeight(0);
      await ad.hideBanner();
      bannerState = 'hidden';
    }
  });
}

// ---------- Vollbild nach einer Runde ----------

let rounds = 0;
let lastInterstitial = 0;
let interstitialReady = false;

function prepareInterstitial() {
  if (!ready || !ids().interstitial) return;
  interstitialReady = false;
  queue(async () => {
    await AdMob().prepareInterstitial({ adId: ids().interstitial, isTesting: USE_TEST_ADS });
    interstitialReady = true;
  });
}

// Nach jedem Rundenende (Quiz, Duell, Tägliche Challenge, Spiele, Karten) aufrufen.
// Die Anzeige ist vorgeladen und erscheint sofort, nicht erst Sekunden später über dem Ergebnis.
export function roundFinished() {
  rounds++;
  if (!ready || !interstitialReady) return;
  if (rounds < INTERSTITIAL_FIRST_ROUND || Date.now() - lastInterstitial < INTERSTITIAL_GAP_MS) return;
  lastInterstitial = Date.now();
  interstitialReady = false;
  queue(() => AdMob().showInterstitial());
}

// ---------- Belohntes Video ----------

export function rewardAvailable() {
  return ready && !!ids().rewarded;
}

// 'earned' | 'aborted' | 'unavailable'.
// ⚠ showRewardVideoAd() löst im Plugin nur im Belohnungsfall auf; bricht jemand ab, kommt nie
// eine Antwort. Deshalb zusätzlich auf Dismissed/FailedToShow hören und hart auf Zeit begrenzen
// (Fehler aus der Mahjong-App: „Video gesehen, nichts passiert“).
let rewardBusy = false;
export async function requestReward() {
  if (!rewardAvailable() || rewardBusy) return 'unavailable';
  rewardBusy = true;
  const ad = AdMob();
  const handles = [];
  let earned = false;
  let shown = false;
  let done;
  const finished = new Promise((resolve) => { done = resolve; });
  let timer = setTimeout(done, 180_000);
  const rearm = (ms) => { clearTimeout(timer); timer = setTimeout(done, ms); };
  try {
    handles.push(await ad.addListener('onRewardedVideoAdShowed', () => { shown = true; }));
    handles.push(await ad.addListener('onRewardedVideoAdReward', () => { earned = true; rearm(15_000); }));
    handles.push(await ad.addListener('onRewardedVideoAdDismissed', () => rearm(400)));
    handles.push(await ad.addListener('onRewardedVideoAdFailedToShow', () => done()));
    showToast(t('ads.loading'));
    try {
      await ad.prepareRewardVideoAd({ adId: ids().rewarded, isTesting: USE_TEST_ADS });
    } catch (e) {
      console.warn('Video nicht geladen:', e);
      return 'unavailable';
    }
    // Bewusst ohne await (siehe oben).
    ad.showRewardVideoAd().then(() => { earned = true; rearm(15_000); }, () => done());
    await finished;
    return earned ? 'earned' : shown ? 'aborted' : 'unavailable';
  } catch (e) {
    console.warn('Video fehlgeschlagen:', e);
    return 'unavailable';
  } finally {
    rewardBusy = false;
    clearTimeout(timer);
    for (const h of handles) { try { await h.remove(); } catch { /* schon entfernt */ } }
  }
}

// ---------- Einwilligung ändern (DSGVO: muss jederzeit möglich sein) ----------

export function hasPrivacyOptions() {
  return isNative() ? privacyOptions : webReady;
}

export async function showPrivacyOptions() {
  if (isNative()) {
    try { await AdMob()?.showPrivacyOptionsForm(); } catch (e) { console.warn(e); }
    return;
  }
  // Googles Einwilligungs-Banner (in AdSense unter „Datenschutz und Mitteilungen“).
  window.googlefc = window.googlefc || {};
  window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
  window.googlefc.callbackQueue.push(() => window.googlefc.showRevocationMessage?.());
}

// ---------- Web (AdSense) ----------

let webReady = false;
let lastWebFill = 0;

function initWeb() {
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  document.head.appendChild(s);
  webReady = true;
  updateWebAd();
}

function updateWebAd() {
  const box = document.getElementById('ad-slot');
  if (!box || !ADSENSE_SLOT) return;
  box.hidden = !wantBanner;
  if (!wantBanner || (box.firstChild && Date.now() - lastWebFill < WEB_REFRESH_MS)) return;
  lastWebFill = Date.now();
  box.innerHTML = `<span class="ad-label">${esc(t('ads.label'))}</span><ins class="adsbygoogle" style="display:block" data-ad-client="${ADSENSE_CLIENT}" data-ad-slot="${ADSENSE_SLOT}" data-ad-format="horizontal" data-full-width-responsive="true"></ins>`;
  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { console.warn(e); }
}
