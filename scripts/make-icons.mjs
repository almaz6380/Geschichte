// Erzeugt alle App-Icons aus der Vorlage icons/icon-source.png (1024×1024, ohne Transparenz):
//   icons/icon-192.png, icon-512.png, apple-touch-icon.png, icon-maskable-512.png (Web-App)
//   assets/icon-only.png, icon-foreground.png, icon-background.png (Vorlagen für @capacitor/assets)
//   assets/splash.png, splash-dark.png (Startbildschirme)
// Eine neue Vorlage (z. B. JPG) wird mit ICON_FROM=<datei> übernommen und als PNG gespeichert.
// Aufruf: [ICON_FROM=bild.jpg] node scripts/make-icons.mjs && npm run assets
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'icons', 'icon-source.png');
const ASSETS = path.join(ROOT, 'assets');
mkdirSync(ASSETS, { recursive: true });

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try { return require('playwright'); } catch { /* weiter */ }
  const globalRoot = execSync('npm root -g').toString().trim();
  return createRequire(path.join(globalRoot, 'x.js'))('playwright');
}

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage();

async function render(size, html, file, transparent = false) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;width:${size}px;height:${size}px;overflow:hidden;background:${transparent ? 'transparent' : '#000'}">${html}</body></html>`);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  writeFileSync(file, await page.screenshot({ clip: { x: 0, y: 0, width: size, height: size }, omitBackground: transparent }));
  console.log('geschrieben:', path.relative(ROOT, file));
}

// Neue Vorlage übernehmen: als PNG ohne Alphakanal speichern (Apple lehnt Transparenz ab).
if (process.env.ICON_FROM) {
  const from = readFileSync(path.resolve(process.env.ICON_FROM));
  const mime = /\.jpe?g$/i.test(process.env.ICON_FROM) ? 'image/jpeg' : 'image/png';
  await render(1024, `<img src="data:${mime};base64,${from.toString('base64')}" style="width:1024px;height:1024px;display:block">`, SOURCE);
}

const src = 'data:image/png;base64,' + readFileSync(SOURCE).toString('base64');
const img = (size, extra = '') => `<img src="${src}" style="width:${size}px;height:${size}px;display:block;${extra}">`;

// Randfarbe der Vorlage (Mittel der vier Ecken) als Hintergrund für Android und Maskable.
await page.setContent(`<canvas id="c" width="1024" height="1024"></canvas>`);
const edge = await page.evaluate(async (s) => {
  const im = new Image(); im.src = s; await im.decode();
  const ctx = document.getElementById('c').getContext('2d'); ctx.drawImage(im, 0, 0);
  const pts = [[8, 8], [1015, 8], [8, 1015], [1015, 1015]];
  const sum = [0, 0, 0];
  for (const [x, y] of pts) { const d = ctx.getImageData(x, y, 1, 1).data; for (let i = 0; i < 3; i++) sum[i] += d[i]; }
  return '#' + sum.map((v) => Math.round(v / 4).toString(16).padStart(2, '0')).join('');
}, src);
console.log('Randfarbe:', edge);

// Web-App
for (const [file, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  await render(size, img(size), path.join(ROOT, 'icons', file));
}
// Maskable: Motiv liegt mittig, die sichere Zone (innere 80 %) reicht ohne Verkleinerung.
await render(512, img(512), path.join(ROOT, 'icons', 'icon-maskable-512.png'));

// Vorlagen für @capacitor/assets
await render(1024, img(1024), path.join(ASSETS, 'icon-only.png'));
// Android adaptiv: Android zeigt nur die innere Fläche; Bild auf 90 % verkleinert, der Rand
// verschwindet unter der Maske, der Hintergrund hat die Randfarbe.
await render(1024, `<div style="width:1024px;height:1024px;display:flex;align-items:center;justify-content:center">${img(922)}</div>`, path.join(ASSETS, 'icon-foreground.png'), true);
await render(1024, `<div style="width:1024px;height:1024px;background:${edge}"></div>`, path.join(ASSETS, 'icon-background.png'));

// Startbildschirme
for (const [file, bg, fg] of [['splash.png', '#f8f7f4', '#1c1b18'], ['splash-dark.png', '#14161b', '#ece9e2']]) {
  await render(2732, `<div style="width:2732px;height:2732px;background:${bg};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:80px;font-family:Georgia,serif">${img(560, 'border-radius:124px;box-shadow:0 30px 80px rgba(0,0,0,.25)')}<div style="font-size:120px;font-weight:700;color:${fg};letter-spacing:-2px">Weltgeschichte</div></div>`, path.join(ASSETS, file));
}
await browser.close();
