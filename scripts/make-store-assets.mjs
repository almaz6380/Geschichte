// Rendert die Vorlagen für @capacitor/assets aus icons/icon.svg:
//   assets/icon-only.png        1024×1024, volles Icon (iOS/allgemein)
//   assets/icon-foreground.png  1024×1024, Motiv auf transparentem Grund (Android adaptive)
//   assets/icon-background.png  1024×1024, Hintergrundverlauf (Android adaptive)
//   assets/splash.png           2732×2732, heller Startbildschirm
//   assets/splash-dark.png      2732×2732, dunkler Startbildschirm
// Aufruf: node scripts/make-store-assets.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets');
mkdirSync(OUT, { recursive: true });

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try { return require('playwright'); } catch { /* weiter */ }
  const globalRoot = execSync('npm root -g').toString().trim();
  return createRequire(path.join(globalRoot, 'x.js'))('playwright');
}

const svg = readFileSync(path.join(ROOT, 'icons', 'icon.svg'), 'utf8');
// Motiv ohne den abgerundeten Hintergrund (für Vordergrund-Ebene)
const motif = svg.replace(/<rect[^>]*rx="112"[^>]*\/>/, '');
const uri = (s) => 'data:image/svg+xml;base64,' + Buffer.from(s).toString('base64');
const ICON = uri(svg);
const MOTIF = uri(motif);
const GRADIENT = 'linear-gradient(135deg, #d97706, #7c2d12)';

const jobs = [
  { file: 'icon-only.png', size: 1024, html: `<div style="width:1024px;height:1024px;background:${GRADIENT}"><img src="${MOTIF}" style="width:1024px;height:1024px"></div>` },
  { file: 'icon-foreground.png', size: 1024, transparent: true, html: `<div style="width:1024px;height:1024px;display:flex;align-items:center;justify-content:center"><img src="${MOTIF}" style="width:660px;height:660px"></div>` },
  { file: 'icon-background.png', size: 1024, html: `<div style="width:1024px;height:1024px;background:${GRADIENT}"></div>` },
  { file: 'splash.png', size: 2732, html: `<div style="width:2732px;height:2732px;background:#f8f7f4;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:80px;font-family:Georgia,serif"><img src="${ICON}" style="width:520px;height:520px;border-radius:114px;box-shadow:0 30px 80px rgba(0,0,0,.18)"><div style="font-size:120px;font-weight:700;color:#1c1b18;letter-spacing:-2px">Weltgeschichte</div></div>` },
  { file: 'splash-dark.png', size: 2732, html: `<div style="width:2732px;height:2732px;background:#14161b;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:80px;font-family:Georgia,serif"><img src="${ICON}" style="width:520px;height:520px;border-radius:114px;box-shadow:0 30px 80px rgba(0,0,0,.5)"><div style="font-size:120px;font-weight:700;color:#ece9e2;letter-spacing:-2px">Weltgeschichte</div></div>` },
];

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage();
for (const j of jobs) {
  await page.setViewportSize({ width: j.size, height: j.size });
  await page.setContent(`<html><body style="margin:0;background:${j.transparent ? 'transparent' : '#fff'}">${j.html}</body></html>`);
  await page.waitForTimeout(100);
  const buf = await page.screenshot({ clip: { x: 0, y: 0, width: j.size, height: j.size }, omitBackground: !!j.transparent });
  writeFileSync(path.join(OUT, j.file), buf);
  console.log('geschrieben:', j.file);
}
await browser.close();
