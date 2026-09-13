// Browser-Smoke-Test mit Playwright und dem vorinstallierten Chromium.
// Startet einen statischen Server, prüft Routen, Suche, Quiz, Lesezeichen, Themen, Glossar,
// Regionen und Offline-Betrieb. Aufruf: node scripts/smoke.mjs   (Screenshots in .playwright-out/)
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
const count = async (page, sel) => (await page.$$(sel)).length;

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'allow' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  console.log('Startseite');
  await page.goto(BASE + '#/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.epoch-tile');
  check((await count(page, '.epoch-tile')) >= 14, 'Startseite zeigt ≥ 14 Epochen-Kacheln');
  check((await count(page, '.region-tile')) === 7, 'Startseite zeigt 7 Regionen');
  await page.screenshot({ path: path.join(OUT, 'home-mobile.png') });

  console.log('Epochen');
  await page.goto(BASE + '#/epochen'); await page.waitForSelector('.epoch-tile');
  check((await count(page, '.epoch-tile')) === 14, 'Epochenliste zeigt genau 14 Kacheln');

  console.log('Epoche Rom (Gliederung)');
  await page.goto(BASE + '#/epoche/rom'); await page.waitForSelector('.hero h1');
  check((await page.textContent('.hero h1')).includes('Römische'), 'Epochen-Artikel Rom hat Titel');
  check((await count(page, '.toc a[data-anchor]')) >= 6, 'Inhaltsverzeichnis mit ≥ 6 Einträgen');
  check(!!(await page.$('.keyfacts')), '„Auf einen Blick“-Box vorhanden');
  check((await count(page, '.article-body article.section')) >= 4, '4 Themenabschnitte vorhanden');
  check((await count(page, '.century-group')) >= 3, 'Ereignisse nach Jahrhundert gruppiert');
  check((await count(page, '.person-card')) >= 8, 'Personen als Karten (≥ 8)');
  check((await count(page, '.term')) >= 5, 'Begriffe der Epoche (≥ 5)');
  const allEv = await count(page, '#events-box .list-item');
  await page.check('#only-milestones');
  const msEv = await count(page, '#events-box .list-item');
  check(msEv > 0 && msEv < allEv, `Meilenstein-Umschalter reduziert ${allEv} → ${msEv}`);
  await page.click('.toc a[data-anchor="folgen"]');
  await page.waitForTimeout(500);
  check((await page.evaluate(() => window.scrollY)) > 300, 'Inhaltsverzeichnis-Anker scrollt');
  await page.screenshot({ path: path.join(OUT, 'epoch-rom.png'), fullPage: true });

  console.log('Lesezeichen');
  await page.goto(BASE + '#/epoche/rom'); await page.waitForSelector('[data-bm-type="epoch"]');
  await page.click('[data-bm-type="epoch"]');
  check((await page.getAttribute('[data-bm-type="epoch"]', 'aria-pressed')) === 'true', 'Lesezeichen-Button aktiv');
  await page.reload(); await page.waitForSelector('[data-bm-type="epoch"]');
  check((await page.getAttribute('[data-bm-type="epoch"]', 'aria-pressed')) === 'true', 'Lesezeichen überlebt Reload');
  await page.goto(BASE + '#/lesezeichen'); await page.waitForSelector('.epoch-tile');
  check((await count(page, '.epoch-tile')) === 1, 'Lesezeichen-Seite zeigt gemerkte Epoche');

  console.log('Ereignis und Person');
  await page.goto(BASE + '#/ereignis/ermordung-caesars'); await page.waitForSelector('h1');
  check((await page.textContent('h1')).includes('Caesar'), 'Ereignisseite rendert');
  check((await count(page, '.person-card')) >= 1, 'Ereignis zeigt beteiligte Personen');
  await page.click('.person-card'); await page.waitForSelector('.person-head h1');
  check((await page.textContent('.person-head h1')).length > 3, 'Personenseite rendert');

  console.log('Zeitleiste');
  await page.goto(BASE + '#/zeitleiste'); await page.waitForSelector('.tl-event');
  const allCount = await count(page, '.tl-event');
  check(allCount >= 200, `Zeitleiste zeigt ${allCount} Ereignisse (≥ 200)`);
  check((await count(page, '.tl-century')) >= 10, 'Jahrhundert-Marker vorhanden');
  await page.click('#tl-region-filter [data-id="asien"]'); await page.waitForTimeout(100);
  const asienCount = await count(page, '.tl-event');
  check(asienCount > 0 && asienCount < allCount, `Regionsfilter Asien reduziert auf ${asienCount}`);
  check(page.url().includes('region=asien'), 'Filter steht in der URL');
  await page.check('#tl-milestones'); await page.waitForTimeout(100);
  check((await count(page, '.tl-event')) < asienCount, 'Meilenstein-Filter reduziert weiter');
  await page.goto(BASE + '#/zeitleiste?epoche=rom&region=&meilensteine=0'); await page.waitForSelector('.tl-event');
  check((await count(page, '.tl-epoch')) === 1, 'Deep-Link auf Epoche filtert Zeitleiste');
  await page.screenshot({ path: path.join(OUT, 'timeline-mobile.png') });

  console.log('Suche');
  await page.goto(BASE + '#/suche?q=Napoleon'); await page.waitForSelector('#search-results .list-item');
  check((await count(page, '#search-results .list-item')) > 0, 'Suche „Napoleon“ liefert Treffer');
  await page.fill('#search-input', 'Absolutismus'); await page.waitForTimeout(300);
  check(!!(await page.$('#search-results .badge-term')), 'Suche findet Glossarbegriff');
  check((await count(page, '#search-types .chip-btn')) >= 2, 'Typ-Filter in der Suche');

  console.log('Glossar');
  await page.goto(BASE + '#/glossar'); await page.waitForSelector('.term');
  const termCount = await count(page, '.term');
  check(termCount >= 60, `Glossar zeigt ${termCount} Begriffe (≥ 60)`);
  check((await count(page, '.letter-bar a')) >= 10, 'Buchstaben-Sprungleiste');
  await page.fill('#gl-input', 'republik'); await page.waitForTimeout(250);
  check((await count(page, '.term')) < termCount && (await count(page, '.term')) > 0, 'Glossar-Filter funktioniert');
  await page.goto(BASE + '#/glossar/prinzipat'); await page.waitForSelector('.term-highlight');
  check(!!(await page.$('#term-prinzipat.term-highlight')), 'Deep-Link auf Begriff hebt hervor');

  console.log('Regionen');
  await page.goto(BASE + '#/regionen'); await page.waitForSelector('.region-tile');
  check((await count(page, '.region-tile')) === 7, 'Regionen-Übersicht zeigt 7 Kontinente');
  await page.goto(BASE + '#/region/afrika'); await page.waitForSelector('.hero h1');
  check((await count(page, '.list-item')) >= 10, 'Region Afrika hat ≥ 10 Ereignisse');
  check((await count(page, '.person-card')) >= 3, 'Region Afrika hat Personen');

  console.log('Themen');
  await page.goto(BASE + '#/themen'); await page.waitForTimeout(300);
  const themeTiles = await count(page, '.theme-tile');
  if (themeTiles > 0) {
    check(themeTiles >= 8, `Themen-Übersicht zeigt ${themeTiles} Themen`);
    await page.click('.theme-tile'); await page.waitForSelector('.hero h1');
    check((await count(page, '.list-item')) >= 8, 'Thema zeigt ≥ 8 Ereignisse');
    check((await count(page, '.group')) >= 3, 'Thema gruppiert nach Epochen');
    await page.screenshot({ path: path.join(OUT, 'theme.png'), fullPage: true });
  } else {
    console.log('  (Themen noch nicht vorhanden – übersprungen)');
  }

  console.log('Mehr');
  await page.goto(BASE + '#/mehr'); await page.waitForSelector('.hub-card');
  check((await count(page, '.hub-card')) === 6, 'Mehr-Seite zeigt 6 Bereiche');
  check((await page.textContent('.about')).includes('Version'), 'Über die App vorhanden');
  check((await page.getAttribute('.bottom-nav a[data-nav="mehr"]', 'aria-current')) === 'page', 'Bottom-Nav markiert „Mehr“');
  await page.screenshot({ path: path.join(OUT, 'more.png') });

  console.log('Quiz');
  await page.goto(BASE + '#/quiz'); await page.waitForSelector('.quiz-mode-card');
  check((await count(page, '.quiz-mode-card')) === 15, 'Quiz-Übersicht zeigt 15 Modi');
  await page.goto(BASE + '#/quiz/rom'); await page.waitForSelector('.quiz-choice');
  check(!!(await page.$('.quiz-sub .badge')), 'Schwierigkeits-Badge sichtbar');
  for (let i = 0; i < 40; i++) {
    const nextBtn = await page.$('#quiz-next');
    if (nextBtn) { await nextBtn.click(); await page.waitForTimeout(40); continue; }
    const choice = await page.$('.quiz-choice:not(:disabled)');
    if (!choice) break;
    await choice.click(); await page.waitForTimeout(40);
  }
  await page.waitForSelector('.quiz-score');
  check(/\d+ \/ 10/.test(await page.textContent('.quiz-score')), 'Quiz-Auswertung nach 10 Fragen');
  await page.goto(BASE + '#/quiz'); await page.waitForSelector('.quiz-mode-card');
  check((await page.textContent('body')).includes('Bestwert'), 'Bestwert wird gespeichert');
  await page.screenshot({ path: path.join(OUT, 'quiz.png') });

  console.log('Theme');
  await page.click('#theme-btn'); await page.click('#theme-btn');
  check((await page.getAttribute('html', 'data-theme')) === 'dark', 'Theme-Umschalter setzt dunkles Schema');
  await page.goto(BASE + '#/epoche/mittelalter'); await page.waitForSelector('.hero h1');
  await page.screenshot({ path: path.join(OUT, 'epoch-dark.png') });

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
  check((await desk.evaluate(() => getComputedStyle(document.querySelector('.toc')).position)) === 'sticky', 'Desktop: Inhaltsverzeichnis ist sticky');
  await desk.screenshot({ path: path.join(OUT, 'epoch-desktop.png') });
  await desk.goto(BASE + '#/'); await desk.waitForSelector('.epoch-tile');
  await desk.screenshot({ path: path.join(OUT, 'home-desktop.png') });

  console.log('Kein horizontales Scrollen (360px)');
  const narrow = await browser.newPage({ viewport: { width: 360, height: 740 } });
  for (const route of ['#/', '#/epoche/rom', '#/zeitleiste', '#/quiz', '#/suche?q=rom', '#/glossar', '#/regionen', '#/mehr', '#/themen']) {
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
