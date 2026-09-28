// Stellt die Web-Fassung fuer oeffentliches Hosting in web/ zusammen.
//
//   node scripts/build-web.mjs
//
// --- Wofuer (28.09.2026) -----------------------------------------------------
//
// Bis dahin lief die Web-Fassung auf Vercel. Am 28.09. hat Vercel den gesamten
// Account pausiert, weil eine ANDERE App des Kontos ihr Blob-Kontingent
// gesprengt hatte — die Geschichte-App war bloss Nachbar. Damit waren
// Datenschutzerklaerung und Impressum tot, und genau die stehen als
// Pflichtangaben in App Store Connect und sind aus der App heraus verlinkt.
//
// Diese App braucht keinen Server: kein api/, kein process.env, nur relative
// Pfade auf eigene Dateien. Sie laeuft auf jedem statischen Hoster. web/ ist
// genau das, was dorthin gehoert.
//
// ⚠ Unterschied zu build-www.mjs: Jenes baut fuer den NATIVEN Wrapper
// (Capacitor) und laesst den Service Worker bewusst weg, weil dort alle
// Dateien lokal liegen. Hier wird er gebraucht — die Web-Fassung soll offline
// funktionieren. Und der Marker data-native wird hier NICHT gesetzt.
import { rmSync, mkdirSync, cpSync, copyFileSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'web');

const ORDNER = ['css', 'js', 'data', 'icons'];
const DATEIEN = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  // Die vier Rechtsseiten. Sie sind der Grund, warum diese Adresse nie wieder
  // ausfallen darf: Apple und Google verlangen sie als Pflichtangabe.
  'datenschutz.html',
  'impressum.html',
  'privacy.html',
  'imprint.html',
];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const d of ORDNER) cpSync(path.join(ROOT, d), path.join(OUT, d), { recursive: true });

const fehlend = [];
for (const f of DATEIEN) {
  if (!existsSync(path.join(ROOT, f))) { fehlend.push(f); continue; }
  copyFileSync(path.join(ROOT, f), path.join(OUT, f));
}
if (fehlend.length) {
  console.error(`FEHLER: Diese Dateien fehlen und wuerden auf der Seite ins Leere zeigen:\n  ${fehlend.join('\n  ')}`);
  process.exit(1);
}

// ⚠ Ohne .nojekyll ignoriert GitHub Pages alle Ordner, die mit _ beginnen, und
// verarbeitet die Seite durch Jekyll. Beides will hier niemand.
writeFileSync(path.join(OUT, '.nojekyll'), '');

// Gegenprobe: Nichts Privates darf mitgekommen sein. Signiermaterial, native
// Projekte und Uebersetzungs-Zwischenstaende bleiben im privaten Repository.
const VERBOTEN = ['ios', 'android', 'fastlane', 'i18n', 'node_modules', '.github'];
for (const v of VERBOTEN) {
  if (existsSync(path.join(OUT, v))) {
    console.error(`FEHLER: ${v}/ ist in web/ gelandet. Das gehoert nicht auf eine oeffentliche Seite.`);
    process.exit(1);
  }
}

const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
console.log(`web/ erstellt (Version ${pkg.version}) — ${DATEIEN.length} Seiten, ${ORDNER.length} Ordner.`);
