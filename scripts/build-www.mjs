// Kopiert die Web-App in den Ordner www/ (Capacitor-webDir) für die nativen Apps.
// Der Service Worker wird bewusst nicht kopiert: In der nativen App liegen alle Dateien lokal.
// Aufruf: node scripts/build-www.mjs
import { rmSync, mkdirSync, cpSync, copyFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'www');

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const dir of ['css', 'js', 'data', 'icons']) cpSync(path.join(ROOT, dir), path.join(OUT, dir), { recursive: true });
for (const f of ['index.html', 'manifest.webmanifest', 'datenschutz.html']) {
  if (existsSync(path.join(ROOT, f))) copyFileSync(path.join(ROOT, f), path.join(OUT, f));
}

// Kennzeichnung, damit die App weiß, dass sie im nativen Wrapper läuft (zusätzlich zur Capacitor-Erkennung).
const idx = path.join(OUT, 'index.html');
writeFileSync(idx, readFileSync(idx, 'utf8').replace('<html lang="de">', '<html lang="de" data-native="1">'));

const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
console.log(`www/ erstellt (Version ${pkg.version}).`);
