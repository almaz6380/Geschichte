# Weltgeschichte in den App Store und bei Google Play veröffentlichen – ohne eigenen Computer

Alles in dieser Anleitung geht **im Browser** (auch auf dem Handy). Die Apps werden von **GitHub in der Cloud gebaut**; für iOS stellt GitHub dafür Mac-Rechner bereit. Du brauchst nur:

- dein GitHub-Konto (Repository `almaz6380/Geschichte`)
- dein Apple-Entwicklerkonto (developer.apple.com, App Store Connect)
- dein Google-Play-Konto (play.google.com/console)

| Store | Name im Store | Kennung |
|---|---|---|
| Apple App Store | Weltgeschichte: Epochen & Quiz | `de.almaz.weltgeschichte` |
| Google Play | Weltgeschichte – Epochen & Quiz | `de.almaz.weltgeschichte` |

Unter dem Icon auf dem Gerät steht „Weltgeschichte“. Apple begrenzt den Store-Namen auf 30 Zeichen, deshalb dort der Doppelpunkt.

Die Cloud-Workflows laufen im Repository unter dem Reiter **Actions**. Sie heißen „iOS App“, „Android App“ und „Android Signierschlüssel erzeugen“. Solange noch keine Schlüssel eingetragen sind, prüfen sie nur, ob die Apps fehlerfrei bauen; sobald die Schlüssel da sind, laden sie hoch bzw. erzeugen die Store-Datei.

**Fertige Screenshots** für beide Stores liegen im Repository unter `docs/screenshots/` (iPhone 6,7″ und 6,5″, iPad 13″, Android-Telefon und -Tablet) sowie die Google-Funktionsgrafik `docs/screenshots/feature-graphic.png`. Zum Herunterladen: Datei auf GitHub öffnen → „Download raw file“ (Pfeil-Symbol).

---

## Teil A: iOS (App Store)

### A1. Kennung (Bundle-ID) registrieren
1. developer.apple.com → **Account** → **Certificates, Identifiers & Profiles** → **Identifiers** → **+**.
2. **App IDs** → Continue → Typ **App** → Continue.
3. Description: `Weltgeschichte`, Bundle ID **Explicit**: `de.almaz.weltgeschichte`. Keine Capabilities nötig → Continue → **Register**.

### A2. Team-ID notieren
developer.apple.com → Account → **Membership details** → **Team ID** (10 Zeichen, z. B. `AB12CD34EF`). Notieren.

### A3. Schlüssel für den Cloud-Upload erzeugen (App Store Connect API)
1. appstoreconnect.apple.com → **Benutzer und Zugriff** → Reiter **Integrationen** → **App Store Connect API** → **Teamschlüssel** → **+** (Schlüssel generieren).
2. Name: `GitHub Upload`, Zugriff: **Admin** (nötig, damit Zertifikate automatisch erstellt werden können) → Generieren.
3. Notieren: **Issuer ID** (oben auf der Seite) und **Schlüssel-ID** (Key ID) des neuen Schlüssels.
4. **API-Schlüssel herunterladen** (Datei `AuthKey_XXXXXXXXXX.p8`). Das geht **nur einmal**. Die Datei mit einer Text-App öffnen; der Inhalt beginnt mit `-----BEGIN PRIVATE KEY-----`. Diesen kompletten Text brauchst du gleich.

### A4. Vier Secrets in GitHub eintragen
github.com/almaz6380/Geschichte → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Vier Einträge:

| Name | Wert |
|---|---|
| `APPLE_TEAM_ID` | deine Team-ID aus A2 |
| `APPSTORE_ISSUER_ID` | Issuer ID aus A3 |
| `APPSTORE_KEY_ID` | Schlüssel-ID aus A3 |
| `APPSTORE_PRIVATE_KEY` | der komplette Inhalt der .p8-Datei inklusive der BEGIN/END-Zeilen |

### A5. App in App Store Connect anlegen
1. appstoreconnect.apple.com → **Meine Apps** → **+** → **Neue App**.
2. Plattform **iOS**, Name `Weltgeschichte: Epochen & Quiz`, Primärsprache **Deutsch**, Bundle-ID `de.almaz.weltgeschichte` (aus A1), SKU `weltgeschichte-1`, Nutzerzugriff **Voller Zugriff** → Erstellen.

### A6. Cloud-Build starten
1. github.com/almaz6380/Geschichte → **Actions** → links **iOS App** → rechts **Run workflow** → **Run workflow**.
2. Dauer 10–20 Minuten. Grüner Haken = Archiv wurde erstellt und nach App Store Connect hochgeladen.
3. Nach weiteren 10–30 Minuten erscheint der Build in App Store Connect (E-Mail von Apple „hat die Verarbeitung abgeschlossen“).

Wenn der Lauf rot ist: auf den Lauf klicken, den fehlgeschlagenen Schritt öffnen, die letzten Zeilen lesen. Häufig: Secret falsch kopiert (Leerzeichen, fehlende BEGIN/END-Zeile), Schlüssel ohne Admin-Rechte, oder A5 wurde noch nicht gemacht („No suitable application records“).

### A7. Store-Eintrag ausfüllen und einreichen
In App Store Connect bei der App:
1. **App-Informationen**: Kategorie **Bildung**, Zweitkategorie **Nachschlagewerke**; Inhaltsrechte „enthält keine Inhalte Dritter“; Altersfreigabe: Fragebogen, alles „Nein“ → 4+.
2. **Preis und Verfügbarkeit**: Kostenlos, alle Länder.
3. **App-Datenschutz**: „Beginnen“ → **Nein, wir erheben keine Daten**. URL: `https://geschichte-gilt.vercel.app/datenschutz.html`.
4. **Version 2.1** (linke Spalte, „iOS-App“):
   - Screenshots 6,7″ aus `docs/screenshots/iphone-67/`, 6,5″ aus `iphone-65/`, iPad 13″ aus `ipad-13/` hochladen (je 3–6 Bilder).
   - Werbetext, Beschreibung, Schlüsselwörter aus `docs/store-texte.md`.
   - Support-URL `https://github.com/almaz6380/Geschichte`, Marketing-URL `https://geschichte-gilt.vercel.app`.
   - **Build**: **+** → den hochgeladenen Build auswählen. Frage zur Exportkonformität: „Nein“ (ist bereits im Projekt hinterlegt).
   - Prüfinformationen: dein Name, Telefon, E-Mail; Anmeldung nicht erforderlich. Notiz: „Lern-App, alle Inhalte enthalten, keine Anmeldung, funktioniert offline.“
   - Versionsfreigabe: automatisch.
5. Oben rechts **Zur Prüfung hinzufügen** → **Einreichen**. Apple meldet sich per E-Mail (meist 1–3 Tage).

---

## Teil B: Android (Google Play)

### B1. Signierschlüssel einmalig erzeugen
1. github.com/almaz6380/Geschichte → **Actions** → **Android Signierschlüssel erzeugen** → **Run workflow**.
2. Nach etwa einer Minute auf den fertigen Lauf klicken. Unten in der **Zusammenfassung** stehen vier Werte.
3. **Settings → Secrets and variables → Actions → New repository secret**, viermal:
   `ANDROID_KEY_ALIAS`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`, `ANDROID_KEYSTORE_BASE64` (den langen Block komplett kopieren).
4. **Wichtig:** Die Werte zusätzlich in einem Passwort-Manager speichern. Der Schlüssel ist auch als Artefakt am Lauf angehängt (90 Tage). Ohne ihn sind später keine Updates möglich. Den Workflow **nicht** ein zweites Mal ausführen.

### B2. App-Bundle bauen
1. **Actions** → **Android App** → **Run workflow**. Dauer etwa 5 Minuten.
2. Auf den fertigen Lauf klicken → unten bei **Artifacts** die Datei `weltgeschichte-android-aab` herunterladen (ZIP, darin `app-release.aab`).

### B3. App in der Play Console anlegen
play.google.com/console → **App erstellen**: Name `Weltgeschichte – Epochen & Quiz`, Standardsprache Deutsch, **App**, **Kostenlos**, Erklärungen bestätigen → Erstellen.

### B4. Einrichtungsaufgaben (Dashboard → „App einrichten“)
- Datenschutzerklärung: `https://geschichte-gilt.vercel.app/datenschutz.html`
- App-Zugriff: alle Funktionen ohne Anmeldung verfügbar
- Anzeigen: Nein
- Inhaltseinstufung: Fragebogen „Nachschlagewerk, Bildung“, alles „Nein“
- Zielgruppe: 13 und älter
- Datensicherheit: erhebt und teilt keine Nutzerdaten
- Staatliche App: Nein; Finanzfunktionen: keine; Gesundheit: keine
- App-Kategorie: **Bildung**; Kontaktdaten eintragen
- **Store-Eintrag**: Kurzbeschreibung und Beschreibung aus `docs/store-texte.md`; App-Symbol 512×512 aus `assets/icon-only.png` (Play skaliert automatisch); Funktionsgrafik `docs/screenshots/feature-graphic.png`; Telefon-Screenshots aus `docs/screenshots/android/`, Tablet aus `android-tablet/`.

### B5. Veröffentlichen
1. **Testen und veröffentlichen → Produktion → Neuen Release erstellen**.
2. Play App Signing bestätigen, `app-release.aab` hochladen, Versionshinweise aus `docs/store-texte.md`.
3. **Release prüfen → Roll-out für Produktion starten**. Google prüft meist innerhalb von Stunden bis wenigen Tagen.

Hinweis: Neue Play-Konten müssen vor der ersten Produktionsfreigabe einen geschlossenen Test mit mindestens 12 Testern über 14 Tage durchführen. Falls die Console das verlangt: unter **Testen → Geschlossener Test** einen Release mit derselben AAB anlegen, Tester per E-Mail-Liste eintragen (Freunde, Familie), nach 14 Tagen den Produktionszugang beantragen.

---

## Teil C: Updates später

1. Inhalte oder Code ändern (per Pull Request oder direkt auf `main`). Vercel und GitHub Pages aktualisieren die Web-App automatisch.
2. Versionsnummer erhöhen: `package.json`, `js/version.js`, `MARKETING_VERSION` in `ios/App/App.xcodeproj/project.pbxproj`, `versionName` in `android/app/build.gradle`. Die Build-Nummern zählen die Workflows automatisch hoch.
3. **Actions → iOS App → Run workflow** (lädt direkt hoch) und **Actions → Android App → Run workflow** (AAB herunterladen und in der Play Console als neuen Release hochladen).
4. In App Store Connect eine neue Version anlegen, Build auswählen, einreichen.

---

## Wenn etwas schiefgeht

- **iOS-Lauf rot bei „Schlüssel bereitstellen und prüfen“**: Die Zusammenfassung des Laufs nennt die Ursache (Schlüssel-ID, Issuer-ID oder `.p8`-Inhalt falsch, Team-ID nicht 10 Zeichen). Das betroffene Secret neu eintragen.
- **iOS-Lauf rot bei „Zertifikat und Profil bereitstellen“ mit „Zertifikat-Limit erreicht“**: Apple erlaubt nur wenige Distribution-Zertifikate pro Team. Die Zusammenfassung des Laufs listet die vorhandenen Zertifikate mit Ablaufdatum. Entweder developer.apple.com → Account → **Certificates** → ein altes „Apple Distribution“-Zertifikat auswählen → **Revoke**, oder beim Start des Workflows („Run workflow“) die Zertifikat-ID ins Feld `revoke_certificate_id` eintragen. Bereits veröffentlichte Apps sind davon nicht betroffen.
- **iOS-Lauf rot beim Hochladen**: App in App Store Connect noch nicht angelegt (A5) oder Build-Nummer bereits verwendet (Workflow einfach erneut starten).
- Das im Cloud-Lauf erzeugte Signierzertifikat wird verschlüsselt im Repository abgelegt (`ios/App/fastlane/certs.tar.enc`, Commit vom Workflow) und bei späteren Läufen wiederverwendet. Nur wer den API-Schlüssel kennt, kann es entschlüsseln. Die Datei nicht löschen, sonst muss ein neues Zertifikat erzeugt werden.
- **Android-Lauf rot bei „Signiertes App-Bundle“**: ein Secret fehlt oder der Base64-Block ist unvollständig kopiert.
- **Apple lehnt mit Richtlinie 4.2 ab („Minimum Functionality“)**: In der Antwort im Resolution Center kurz erklären, dass die App eine eigenständige Lern-App mit vollständig enthaltenen Inhalten, Quiz mit gespeichertem Fortschritt, Lesezeichen und Offline-Betrieb ist. Meist reicht das.
- **Play Console verlangt geschlossenen Test**: siehe Hinweis in B5.
