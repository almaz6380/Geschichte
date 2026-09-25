// Erzeugt Store-Screenshots der App mit dem vorinstallierten Chromium.
//   docs/screenshots/iphone-67/   1290×2796 (iPhone 6,7 Zoll, App Store Pflichtformat)
//   docs/screenshots/iphone-65/   1242×2688 (iPhone 6,5 Zoll)
//   docs/screenshots/ipad-13/     2064×2752 (iPad 13 Zoll)
//   docs/screenshots/android/     1080×2340 (Telefon) und docs/screenshots/android-tablet/ 1600×2560
//   docs/screenshots/feature-graphic.png 1024×500 (Google Play Funktionsgrafik)
// Aufruf: node scripts/make-screenshots.mjs            (Deutsch, docs/screenshots/)
//        SHOT_LANG=en node scripts/make-screenshots.mjs (Englisch, docs/screenshots/en/)
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 8769);
const BASE = `http://127.0.0.1:${PORT}/`;
const LANG = process.env.SHOT_LANG || 'de';
const OUT = LANG === 'de' ? path.join(ROOT, 'docs', 'screenshots') : path.join(ROOT, 'docs', 'screenshots', LANG);
const FEATURE = {
  de: { title: 'Weltgeschichte', line1: 'Epochen · Themen · Zeitleiste · Quiz', line2: 'Von der Steinzeit bis heute. Komplett offline.' },
  en: { title: 'World History', line1: 'Epochs · Themes · Timeline · Quiz', line2: 'From the Stone Age to today. Fully offline.' },
}[LANG];

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try { return require('playwright'); } catch { /* weiter */ }
  const globalRoot = execSync('npm root -g').toString().trim();
  return createRequire(path.join(globalRoot, 'x.js'))('playwright');
}

const SHOTS = [
  { name: '01-start', url: '#/', wait: '.epoch-tile' },
  { name: '02-epoche', url: '#/epoche/rom', wait: '.keyfacts' },
  { name: '03-zeitleiste', url: '#/zeitleiste', wait: '.tl-event' },
  { name: '04-thema', url: '#/thema/wissenschaft-technik', wait: '.hero h1' },
  { name: '05-quiz', url: '#/quiz/rom', wait: '.quiz-choice' },
  { name: '06-glossar', url: '#/glossar', wait: '.term' },
];

// Breite/Höhe in CSS-Pixeln und Skalierung -> Ausgabegröße
const DEVICES = [
  { dir: 'iphone-67', width: 430, height: 932, scale: 3 },       // 1290×2796
  { dir: 'iphone-65', width: 414, height: 896, scale: 3 },       // 1242×2688
  { dir: 'ipad-13', width: 1032, height: 1376, scale: 2 },       // 2064×2752
  { dir: 'android', width: 360, height: 780, scale: 3 },         // 1080×2340
  { dir: 'android-tablet', width: 800, height: 1280, scale: 2 }, // 1600×2560
];

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
try {
  for (const d of DEVICES) {
    mkdirSync(path.join(OUT, d.dir), { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: d.width, height: d.height }, deviceScaleFactor: d.scale, isMobile: d.width < 700, hasTouch: true, locale: LANG === 'en' ? 'en-US' : 'de-DE' });
    const page = await ctx.newPage();
    // Native Optik: kein Installieren-Button
    await page.addInitScript((lang) => {
      document.documentElement.dataset.native = '1';
      try { localStorage.setItem('wg.lang', JSON.stringify(lang)); } catch { /* egal */ }
    }, LANG);
    for (const s of SHOTS) {
      await page.goto(BASE + s.url, { waitUntil: 'networkidle' });
      await page.waitForSelector(s.wait);
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, d.dir, `${s.name}.png`) });
    }
    await ctx.close();
    console.log(`${d.dir}: ${SHOTS.length} Screenshots (${d.width * d.scale}×${d.height * d.scale})`);
  }

  // Funktionsgrafik 1024×500 für Google Play
  const uri = 'data:image/png;base64,' + readFileSync(path.join(ROOT, 'icons', 'icon-source.png')).toString('base64');
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
  await page.setContent(`<html><body style="margin:0"><div style="width:1024px;height:500px;background:linear-gradient(135deg,#d97706,#7c2d12);display:flex;align-items:center;justify-content:center;gap:48px;font-family:Georgia,serif;color:#fff7ed">
    <img src="${uri}" style="width:280px;height:280px;border-radius:62px;box-shadow:0 20px 60px rgba(0,0,0,.35)">
    <div><div style="font-size:64px;font-weight:700;letter-spacing:-1px">${FEATURE.title}</div><div style="font-size:30px;opacity:.9;margin-top:8px">${FEATURE.line1}</div><div style="font-size:24px;opacity:.8;margin-top:18px">${FEATURE.line2}</div></div>
  </div></body></html>`);
  await page.waitForTimeout(200);
  writeFileSync(path.join(OUT, 'feature-graphic.png'), await page.screenshot());
  console.log('feature-graphic.png (1024×500)');
} finally {
  await browser.close();
  server.kill();
}
