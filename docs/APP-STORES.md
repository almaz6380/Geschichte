# Weltgeschichte in den App Store und bei Google Play veröffentlichen

Diese Anleitung führt Schritt für Schritt von diesem Repository bis zur eingereichten App. Sie ist für einen **Mac** geschrieben (für iOS zwingend). Rechne für die erste Einreichung mit etwa zwei bis drei Stunden reiner Klickarbeit plus Wartezeit auf die Prüfung durch Apple (meist 1–3 Tage) und Google (Stunden bis wenige Tage).

Die nativen Projekte liegen fertig im Repository (`ios/` und `android/`). Sie verpacken die Web-App mit **Capacitor**; alle Inhalte sind in der App enthalten, sie braucht keinen Server.

| Store | Name | Bundle-ID / Package | Kosten |
|---|---|---|---|
| Apple App Store | Weltgeschichte: Epochen & Quiz | `de.almaz.weltgeschichte` | Apple Developer Program, 99 US-Dollar pro Jahr |
| Google Play | Weltgeschichte – Epochen & Quiz | `de.almaz.weltgeschichte` | Play Console, 25 US-Dollar einmalig |

Unter dem App-Icon auf dem Gerät steht kurz „Weltgeschichte“. Apple begrenzt den Store-Namen auf 30 Zeichen, deshalb dort die Schreibweise mit Doppelpunkt.

---

## Teil 0: Einmalige Vorbereitung auf dem Mac

1. **Xcode** aus dem Mac App Store installieren (groß, dauert), einmal öffnen und die Zusatzkomponenten installieren lassen.
2. **Node.js 22** installieren (nodejs.org oder `brew install node@22`).
3. **Android Studio** installieren (developer.android.com/studio), beim ersten Start das Standard-SDK installieren lassen.
4. **Apple Developer Program** unter developer.apple.com/programs beitreten (mit deiner Apple-ID, 99 US-Dollar/Jahr). Die Freischaltung kann bis zu 48 Stunden dauern.
5. **Google Play Console** unter play.google.com/console anlegen (25 US-Dollar einmalig, Identitätsprüfung nötig).

## Teil 1: Projekt holen und bauen

Im Terminal:

```bash
git clone https://github.com/almaz6380/Geschichte.git
cd Geschichte
npm install
npm run cap:sync
```

`npm run cap:sync` kopiert die Web-App nach `www/` und in beide nativen Projekte. **Diesen Befehl nach jeder Änderung an der Web-App wiederholen.**

---

## Teil 2: iOS – App Store

### 2.1 Projekt in Xcode öffnen

```bash
npm run ios
```

Xcode öffnet das Projekt `ios/App/App.xcworkspace` bzw. `App.xcodeproj`. Beim ersten Öffnen lädt Xcode die Capacitor-Pakete per Swift Package Manager (unten rechts läuft ein Fortschrittsbalken). Warten, bis das fertig ist.

### 2.2 Signieren

1. Links im Projektnavigator ganz oben auf **App** (blaues Icon) klicken.
2. Reiter **Signing & Capabilities**.
3. **Automatically manage signing** anhaken.
4. Bei **Team** dein Entwicklerkonto auswählen (beim ersten Mal: Xcode → Settings → Accounts → „+“ → Apple-ID anmelden).
5. **Bundle Identifier** muss `de.almaz.weltgeschichte` sein (ist voreingestellt).

Wenn hier ein roter Fehler steht, ist meist das Developer Program noch nicht freigeschaltet. Dann warten.

### 2.3 Auf dem eigenen iPhone testen (empfohlen)

1. iPhone per Kabel anschließen, entsperren, „Vertrauen“ bestätigen.
2. Oben in Xcode das iPhone als Ziel auswählen und **▶ Run** drücken.
3. Beim ersten Mal auf dem iPhone unter Einstellungen → Allgemein → VPN & Geräteverwaltung das Entwicklerzertifikat vertrauen.
4. App durchklicken: Epochen, Zeitleiste, Quiz, Suche, Lesezeichen, dunkles Farbschema.

### 2.4 Archiv erstellen und hochladen

1. Oben als Ziel **Any iOS Device (arm64)** auswählen.
2. Menü **Product → Archive**. Dauert einige Minuten.
3. Es öffnet sich der **Organizer**. Das neue Archiv auswählen → **Distribute App** → **App Store Connect** → **Upload** → alle Voreinstellungen bestätigen → **Upload**.
4. Nach dem Upload dauert es 10–30 Minuten, bis der Build in App Store Connect unter „TestFlight“ erscheint (du bekommst eine E-Mail).

### 2.5 App in App Store Connect anlegen

Auf appstoreconnect.apple.com:

1. **Meine Apps → „+“ → Neue App**.
   - Plattform: iOS
   - Name: `Weltgeschichte: Epochen & Quiz`
   - Primärsprache: Deutsch
   - Bundle-ID: `de.almaz.weltgeschichte` (erscheint automatisch, nachdem Xcode einmal signiert hat)
   - SKU: `weltgeschichte-1`
   - Nutzerzugriff: Voller Zugriff
2. Linke Spalte **App-Informationen**: Kategorie **Bildung**, Zweitkategorie **Nachschlagewerke**. Inhaltsrechte: „enthält keine Inhalte Dritter“.
3. **Preis und Verfügbarkeit**: Kostenlos, alle Länder.
4. **App-Datenschutz**: „Beginnen“ → **Nein, wir erheben keine Daten von dieser App**. Datenschutzrichtlinien-URL: `https://geschichte-gilt.vercel.app/datenschutz.html`
5. Linke Spalte **1.0 Zur Einreichung vorbereiten** (Version):
   - **Screenshots**: Pflicht für 6,7-Zoll-iPhone (1290×2796) und optional 6,5-Zoll. Am einfachsten: App im **iPhone-16-Pro-Max-Simulator** von Xcode starten und mit ⌘S Screenshots machen. Gute Motive: Startseite, ein Epochen-Artikel (Rom), Zeitleiste, Quizfrage, Glossar, ein Querschnittsthema. Für iPad (13 Zoll) ebenfalls Screenshots, falls die App auch für iPad angeboten wird; sonst in Xcode unter „General → Supported Destinations“ iPad entfernen.
   - **Werbetext, Beschreibung, Schlüsselwörter**: Texte aus `docs/store-texte.md` einfügen.
   - **Support-URL**: `https://github.com/almaz6380/Geschichte`
   - **Build**: „+“ → den hochgeladenen Build auswählen.
   - **Altersfreigabe**: alle Fragen mit „Nein“ → 4+.
   - **Prüfinformationen**: Kontaktname, Telefon, E-Mail; Anmeldung nicht erforderlich. Notiz für den Prüfer: „Lern-App mit vollständig enthaltenen Inhalten, keine Anmeldung, funktioniert offline.“
   - **Versionsfreigabe**: „Diese Version automatisch freigeben“.
6. Oben rechts **Zur Prüfung hinzufügen** → **Einreichen**.

Apple meldet sich per E-Mail. Bei Ablehnung steht der Grund im „Resolution Center“; meistens fehlt nur ein Screenshot oder eine Angabe.

---

## Teil 3: Android – Google Play

### 3.1 Projekt in Android Studio öffnen

```bash
npm run android
```

Android Studio öffnet den Ordner `android/`. Beim ersten Mal lädt Gradle Abhängigkeiten (mehrere Minuten). Falls nach einer Java-Version gefragt wird: Android Studio bringt ein passendes JDK 17/21 mit; unter File → Settings → Build Tools → Gradle „Embedded JDK“ wählen.

### 3.2 Auf dem eigenen Android-Gerät testen (empfohlen)

USB-Debugging am Gerät aktivieren (Entwickleroptionen), Gerät anschließen, oben als Ziel wählen, **▶ Run**.

### 3.3 Signiertes App-Bundle erstellen

1. Menü **Build → Generate Signed App Bundle / APK** → **Android App Bundle** → Next.
2. **Create new…** Keystore:
   - Pfad: außerhalb des Repositories, zum Beispiel `~/Keys/weltgeschichte.jks`
   - Passwörter vergeben und **sicher aufbewahren** (Passwort-Manager). Ohne diesen Keystore kannst du später keine Updates mehr veröffentlichen.
   - Alias: `weltgeschichte`, Gültigkeit 25 Jahre, Name/Organisation ausfüllen.
3. Build-Variante **release** → Create. Das Ergebnis liegt unter `android/app/release/app-release.aab`.

### 3.4 App in der Play Console anlegen

Auf play.google.com/console:

1. **App erstellen**: Name `Weltgeschichte – Epochen & Quiz`, Standardsprache Deutsch, App, Kostenlos, Erklärungen bestätigen.
2. Linke Spalte **Dashboard** → die Aufgabenliste „App einrichten“ abarbeiten:
   - **Datenschutzerklärung**: `https://geschichte-gilt.vercel.app/datenschutz.html`
   - **App-Zugriff**: Alle Funktionen ohne Anmeldung verfügbar.
   - **Anzeigen**: Nein.
   - **Inhaltseinstufung**: Fragebogen, Kategorie „Nachschlagewerk/Bildung“, alles „Nein“.
   - **Zielgruppe**: 13+ (oder „alle Altersgruppen“; dann greift die Richtlinie für Familien, die zusätzliche Angaben verlangt, „13+“ ist einfacher).
   - **Datensicherheit**: „Erhebt oder teilt keine Nutzerdaten“, Daten werden nicht verschlüsselt übertragen (es gibt keine Übertragung), keine Löschanfrage nötig.
   - **Staatliche Apps**: Nein. **Finanzfunktionen**: keine.
3. **Store-Eintrag**: Kurzbeschreibung und vollständige Beschreibung aus `docs/store-texte.md`, App-Symbol 512×512 (`assets/icon-only.png`), Funktionsgrafik 1024×500 (kann aus `assets/splash.png` zugeschnitten werden), mindestens 2 Telefon-Screenshots (Emulator in Android Studio, Kamera-Symbol).
4. **Produktion → Neuen Release erstellen**: Play App Signing akzeptieren, `app-release.aab` hochladen, Versionshinweise einfügen, **Release prüfen → Roll-out starten**.

Die erste Prüfung dauert meist einige Stunden bis wenige Tage.

---

## Teil 4: Updates veröffentlichen

1. Änderungen an der Web-App machen (Inhalte in `data/`, Code in `js/`), `npm run validate && npm test`.
2. Version erhöhen: in `package.json`, `js/version.js`, iOS (`MARKETING_VERSION` in Xcode unter General → Identity, Build um 1 erhöhen) und Android (`versionName` und `versionCode` in `android/app/build.gradle`, `versionCode` muss immer steigen).
3. `npm run cap:sync`.
4. iOS: Product → Archive → Upload → in App Store Connect neue Version anlegen und einreichen.
5. Android: Signiertes Bundle mit demselben Keystore erstellen → Produktion → neuer Release.

---

## Häufige Stolpersteine

- **„No signing certificate“ in Xcode**: Developer Program noch nicht aktiv, oder unter Xcode → Settings → Accounts nicht angemeldet.
- **Apple lehnt mit Richtlinie 4.2 (Minimum Functionality) ab**: Kommt bei reinen Website-Hüllen vor. Diese App enthält alle Inhalte lokal, ein Quiz mit Fortschritt, Lesezeichen und Offline-Betrieb; in der Prüfer-Notiz darauf hinweisen. Bei Rückfrage zwei, drei Sätze antworten, meist reicht das.
- **Fehlende iPad-Screenshots**: entweder iPad-Screenshots nachliefern oder iPad als Ziel in Xcode entfernen.
- **Gradle-Fehler in Android Studio**: File → Invalidate Caches → Restart; dann „Sync Project with Gradle Files“.
- **Keystore verloren**: Dann sind keine Updates der Android-App mehr möglich. Deshalb Passwort-Manager und Backup.
- **Weiße Seite in der App**: `npm run cap:sync` vergessen, dadurch fehlt `www/` in den Projekten.
