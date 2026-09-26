// AdMob-Anzeigenblöcke je Plattform. Solange hier Googles Test-IDs stehen, laufen nur
// Test-Anzeigen (isTesting). Echte IDs aus dem AdMob-Konto eintragen und TESTING auf false
// setzen; die App-IDs stehen zusätzlich in ios/App/App/Info.plist (GADApplicationIdentifier)
// und android/app/src/main/res/values/strings.xml (admob_app_id).
export const TESTING = true;

export const AD_UNITS = {
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
  },
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
  },
};

// Vollbild-Anzeige höchstens so oft (Millisekunden).
export const INTERSTITIAL_GAP = 3 * 60 * 1000;
