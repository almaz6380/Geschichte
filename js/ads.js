// Werbung über Google AdMob – nur in der nativen App (Capacitor-Plugin), nie in der Web-App.
// Ablauf beim Start: Einwilligung (UMP, DSGVO) → auf dem iPhone die Tracking-Abfrage (ATT)
// → Banner. Ohne Einwilligung zeigt Google nicht personalisierte Anzeigen oder gar keine.
import { AD_UNITS, TESTING, INTERSTITIAL_GAP } from './ads-config.js';

const plugin = () => window.Capacitor?.Plugins?.AdMob;
const platform = () => window.Capacitor?.getPlatform?.();

let canRequest = false;
let privacyOptions = false;
let lastInterstitial = 0;
let bannerOn = false;

const units = () => AD_UNITS[platform()] || null;

export function adsEnabled() {
  return !!(plugin() && units() && canRequest);
}

// Einstellungen „Werbung und Datenschutz“ nur anbieten, wenn Google dafür ein Formular hat.
export function hasPrivacyOptions() {
  return !!(plugin() && privacyOptions);
}

export async function showPrivacyOptions() {
  const A = plugin();
  if (!A) return;
  try {
    await A.showPrivacyOptionsForm();
    const info = await A.requestConsentInfo();
    canRequest = !!info.canRequestAds;
    if (canRequest && !bannerOn) showBanner();
  } catch (err) {
    console.warn('Datenschutz-Optionen:', err);
  }
}

export async function initAds() {
  const A = plugin();
  if (!A || !units()) return;
  try {
    await A.initialize({ initializeForTesting: TESTING });
    let info = await A.requestConsentInfo();
    if (!info.canRequestAds && info.isConsentFormAvailable && info.status === 'REQUIRED') {
      info = await A.showConsentForm();
    }
    canRequest = !!info.canRequestAds;
    privacyOptions = info.privacyOptionsRequirementStatus === 'REQUIRED';

    // iPhone: Apples Tracking-Abfrage erst nach der DSGVO-Einwilligung.
    if (platform() === 'ios') {
      const { status } = await A.trackingAuthorizationStatus();
      if (status === 'notDetermined') await A.requestTrackingAuthorization();
    }
    if (canRequest) await showBanner();
  } catch (err) {
    console.warn('Werbung konnte nicht gestartet werden:', err);
  }
}

// Banner unten, direkt über der Navigationsleiste. Die Seite bekommt unten so viel Platz,
// wie das Banner hoch ist (CSS-Variable --ad-h), damit es keinen Inhalt verdeckt.
async function showBanner() {
  const A = plugin();
  const nav = document.querySelector('.bottom-nav');
  const navVisible = nav && getComputedStyle(nav).display !== 'none';
  const margin = navVisible ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 60 : 0;
  try {
    await A.addListener('bannerAdSizeChanged', (size) => {
      document.documentElement.style.setProperty('--ad-h', `${Math.round(size?.height || 0)}px`);
    });
    await A.showBanner({
      adId: units().banner,
      adSize: 'ADAPTIVE_BANNER',
      position: 'BOTTOM_CENTER',
      margin,
      isTesting: TESTING,
    });
    bannerOn = true;
    document.documentElement.classList.add('has-ad');
  } catch (err) {
    console.warn('Banner:', err);
  }
}

// Vollbild-Anzeige, z. B. nach einem abgeschlossenen Quiz; höchstens alle paar Minuten.
export async function maybeShowInterstitial() {
  if (!adsEnabled() || Date.now() - lastInterstitial < INTERSTITIAL_GAP) return;
  const A = plugin();
  try {
    await A.prepareInterstitial({ adId: units().interstitial, isTesting: TESTING });
    await A.showInterstitial();
    lastInterstitial = Date.now();
  } catch (err) {
    console.warn('Vollbild-Anzeige:', err);
  }
}

// Anzeige mit Belohnung. Liefert true, wenn die Belohnung verdient wurde.
export async function showRewarded() {
  if (!adsEnabled()) return false;
  const A = plugin();
  const handles = [];
  try {
    await A.prepareRewardVideoAd({ adId: units().rewarded, isTesting: TESTING });
    return await new Promise((resolve) => {
      let earned = false;
      const done = (v) => resolve(v);
      A.addListener('onRewardedVideoAdReward', () => { earned = true; }).then((h) => handles.push(h));
      A.addListener('onRewardedVideoAdDismissed', () => done(earned)).then((h) => handles.push(h));
      A.addListener('onRewardedVideoAdFailedToShow', () => done(false)).then((h) => handles.push(h));
      A.showRewardVideoAd().then((item) => { if (item) earned = true; }).catch(() => done(false));
    });
  } catch (err) {
    console.warn('Belohnungs-Anzeige:', err);
    return false;
  } finally {
    handles.forEach((h) => h?.remove?.());
  }
}
