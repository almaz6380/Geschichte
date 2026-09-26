// AdMob-Anzeigenblöcke je Plattform (Konto „Weltgeschichte“). Die App-IDs stehen zusätzlich in
// ios/App/App/Info.plist (GADApplicationIdentifier) und
// android/app/src/main/res/values/strings.xml (admob_app_id).
// TESTING = true zeigt nur Googles Test-Anzeigen (zum Ausprobieren, nie für den Store-Build).
export const TESTING = false;

export const AD_UNITS = {
  ios: {
    banner: 'ca-app-pub-8860791993288062/5729544172',
    interstitial: 'ca-app-pub-8860791993288062/9146968445',
    rewarded: 'ca-app-pub-8860791993288062/7043549288',
  },
  android: {
    banner: 'ca-app-pub-8860791993288062/7254378838',
    interstitial: 'ca-app-pub-8860791993288062/6712376797',
    rewarded: 'ca-app-pub-8860791993288062/5399295127',
  },
};

// Vollbild-Anzeige höchstens so oft (Millisekunden).
export const INTERSTITIAL_GAP = 3 * 60 * 1000;
