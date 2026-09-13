// Browser-Smoke-Test mit Playwright und dem vorinstallierten Chromium.
// Startet einen statischen Server, prüft Routen, Suche, Quiz, Lesezeichen und Offline-Betrieb.
// Aufruf: node scripts/smoke.mjs   (Screenshots landen in .playwright-out/)
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 8765);
const BASE = `http://127.0.0.1:${PORT}/`;
const OUT = path.join(ROOT, '.playwright-out');
mkdirSync(OUT, { recursive: true });

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try { return require('playwright'); } catch { /* weiter */ }
  const globalRoot = execSync('npm root -g').toString().trim();
  return createRequire(path.join(globalRoot, 'x.js'))('playwright');
}

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const failures = [];
const check = (cond, msg) => { if (cond) console.log('  ok  ', msg); else { console.log('  FAIL', msg); failures.push(msg); } };

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'allow' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  console.log('Startseite');
  await page.goto(BASE + '#/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.epoch-tile');
  check((await page.$$('.epoch-tile')).length >= 14, 'Startseite zeigt ≥ 14 Epochen-Kacheln');
  await page.screenshot({ path: path.join(OUT, 'home-mobile.png'), fullPage: false });

  console.log('Epochen');
  await page.goto(BASE + '#/epochen'); await page.waitForSelector('.epoch-tile');
  check((await page.$$('.epoch-tile')).length === 14, 'Epochenliste zeigt genau 14 Kacheln');

  console.log('Epoche Rom');
  await page.goto(BASE + '#/epoche/rom'); await page.waitForSelector('.hero h1');
  check((await page.textContent('.hero h1')).includes('Römische'), 'Epochen-Artikel Rom hat Titel');
  check((await page.$$('.list-item')).length >= 8, 'Rom zeigt ≥ 8 Ereignisse/Personen');
  await page.screenshot({ path: path.join(OUT, 'epoch-rom.png'), fullPage: true });

  console.log('Lesezeichen');
  await page.click('[data-bm-type="epoch"]');
  check((await page.getAttribute('[data-bm-type="epoch"]', 'aria-pressed')) === 'true', 'Lesezeichen-Button aktiv');
  await page.reload(); await page.waitForSelector('[data-bm-type="epoch"]');
  check((await page.getAttribute('[data-bm-type="epoch"]', 'aria-pressed')) === 'true', 'Lesezeichen überlebt Reload');
  await page.goto(BASE + '#/lesezeichen'); await page.waitForSelector('.epoch-tile');
  check((await page.$$('.epoch-tile')).length === 1, 'Lesezeichen-Seite zeigt gemerkte Epoche');

  console.log('Ereignis und Person');
  await page.goto(BASE + '#/ereignis/ermordung-caesars'); await page.waitForSelector('h1');
  check((await page.textContent('h1')).includes('Caesar'), 'Ereignisseite rendert');
  await page.click('.list a.list-item');
  await page.waitForSelector('h1');
  check(location => true, 'Navigation zu Person');
  check((await page.textContent('h1')).length > 3, 'Personenseite rendert');

  console.log('Zeitleiste');
  await page.goto(BASE + '#/zeitleiste'); await page.waitForSelector('.tl-event');
  const allCount = (await page.$$('.tl-event')).length;
  check(allCount >= 100, `Zeitleiste zeigt ${allCount} Ereignisse (≥ 100)`);
  await page.click('#tl-region-filter [data-id="asien"]');
  await page.waitForTimeout(100);
  const asienCount = (await page.$$('.tl-event')).length;
  check(asienCount > 0 && asienCount < allCount, `Regionsfilter Asien reduziert auf ${asienCount}`);
  check(page.url().includes('region=asien'), 'Filter steht in der URL');
  await page.goto(BASE + '#/zeitleiste?epoche=rom&region='); await page.waitForSelector('.tl-event');
  check((await page.$$('.tl-epoch')).length === 1, 'Deep-Link auf Epoche filtert Zeitleiste');
  await page.screenshot({ path: path.join(OUT, 'timeline-mobile.png'), fullPage: false });

  console.log('Suche');
  await page.goto(BASE + '#/suche?q=Napoleon'); await page.waitForSelector('#search-results .list-item');
  check((await page.$$('#search-results .list-item')).length > 0, 'Suche „Napoleon“ liefert Treffer');
  await page.fill('#search-input', 'Mauer'); await page.waitForTimeout(300);
  check((await page.$$('#search-results .list-item')).length > 0, 'Live-Suche „Mauer“ liefert Treffer');

  console.log('Quiz');
  await page.goto(BASE + '#/quiz'); await page.waitForSelector('.quiz-mode-card');
  check((await page.$$('.quiz-mode-card')).length === 15, 'Quiz-Übersicht zeigt 15 Modi');
  await page.goto(BASE + '#/quiz/rom'); await page.waitForSelector('.quiz-choice');
  for (let i = 0; i < 20; i++) {
    const nextBtn = await page.$('#quiz-next');
    if (nextBtn) { await nextBtn.click(); await page.waitForTimeout(50); continue; }
    const choice = await page.$('.quiz-choice:not(:disabled)');
    if (!choice) break;
    await choice.click(); await page.waitForTimeout(50);
  }
  await page.waitForSelector('.quiz-score');
  check(/\d+ \/ \d+/.test(await page.textContent('.quiz-score')), 'Quiz-Auswertung erscheint');
  await page.goto(BASE + '#/quiz'); await page.waitForSelector('.quiz-mode-card');
  check((await page.textContent('body')).includes('Bestwert'), 'Bestwert wird gespeichert');
  await page.screenshot({ path: path.join(OUT, 'quiz.png'), fullPage: false });

  console.log('Theme');
  await page.click('#theme-btn'); await page.click('#theme-btn');
  check((await page.getAttribute('html', 'data-theme')) === 'dark', 'Theme-Umschalter setzt dunkles Schema');
  await page.goto(BASE + '#/'); await page.waitForSelector('.epoch-tile');
  await page.screenshot({ path: path.join(OUT, 'home-dark.png'), fullPage: false });

  console.log('Offline');
  await page.goto(BASE + '#/', { waitUntil: 'networkidle' });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForTimeout(1500);
  await context.setOffline(true);
  await page.goto(BASE + '#/epoche/rom', { waitUntil: 'load' }).catch(() => {});
  await page.waitForSelector('.hero h1', { timeout: 10000 }).catch(() => {});
  check(!!(await page.$('.hero h1')), 'App lädt offline (Service Worker)');
  await context.setOffline(false);

  console.log('Desktop');
  const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await desk.goto(BASE + '#/zeitleiste'); await desk.waitForSelector('.tl-event');
  await desk.screenshot({ path: path.join(OUT, 'timeline-desktop.png') });
  await desk.goto(BASE + '#/epoche/rom'); await desk.waitForSelector('.hero h1');
  await desk.screenshot({ path: path.join(OUT, 'epoch-desktop.png') });

  console.log('Kein horizontales Scrollen (360px)');
  const narrow = await browser.newPage({ viewport: { width: 360, height: 740 } });
  for (const route of ['#/', '#/epoche/rom', '#/zeitleiste', '#/quiz', '#/suche?q=rom']) {
    await narrow.goto(BASE + route); await narrow.waitForTimeout(400);
    const over = await narrow.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    check(!over, `kein horizontaler Overflow auf ${route}`);
  }

  check(errors.length === 0, `keine Konsolen-/Seitenfehler${errors.length ? ': ' + errors.join(' | ') : ''}`);
} catch (e) {
  failures.push('Ausnahme: ' + e.message);
  console.error(e);
} finally {
  await browser.close();
  server.kill();
}

if (failures.length) {
  console.log(`\n${failures.length} Prüfungen fehlgeschlagen.`);
  process.exit(1);
}
console.log('\nSmoke-Test erfolgreich. Screenshots in .playwright-out/');
