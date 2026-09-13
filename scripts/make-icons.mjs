// Rendert icons/icon.svg mit dem vorinstallierten Chromium (Playwright) zu PNG-Icons.
// Aufruf: node scripts/make-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try { return require('playwright'); } catch { /* weiter */ }
  const globalRoot = execSync('npm root -g').toString().trim();
  return createRequire(path.join(globalRoot, 'x.js'))('playwright');
}

const { chromium } = loadPlaywright();
const svg = readFileSync(path.join(ROOT, 'icons', 'icon.svg'), 'utf8');
const dataUri = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');

const targets = [
  { file: 'icon-192.png', size: 192, pad: 0 },
  { file: 'icon-512.png', size: 512, pad: 0 },
  { file: 'apple-touch-icon.png', size: 180, pad: 0 },
  // Maskable: Motiv in die sichere Zone (innere 80 %) setzen, Hintergrund füllt den Rand.
  { file: 'icon-maskable-512.png', size: 512, pad: 0.12 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size });
  const inner = Math.round(t.size * (1 - 2 * t.pad));
  const off = Math.round(t.size * t.pad);
  await page.setContent(`<html><body style="margin:0;background:#b45309;width:${t.size}px;height:${t.size}px;overflow:hidden">
    <img src="${dataUri}" style="position:absolute;left:${off}px;top:${off}px;width:${inner}px;height:${inner}px;${t.pad ? 'border-radius:0' : ''}"></body></html>`);
  const buf = await page.screenshot({ clip: { x: 0, y: 0, width: t.size, height: t.size }, omitBackground: false });
  writeFileSync(path.join(ROOT, 'icons', t.file), buf);
  console.log('geschrieben:', t.file);
}
await browser.close();
