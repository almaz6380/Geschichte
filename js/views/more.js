import { DB } from '../data.js';
import { esc, setTitle, plural } from '../ui.js';
import { getQuizProgress, bookmarkCount, resetQuizProgress, getTheme } from '../store.js';
import { cycleTheme, themeLabel } from '../theme.js';
import { showToast } from '../ui.js';
import { APP_VERSION } from '../version.js';

export function render(el) {
  setTitle('Mehr');
  const progress = getQuizProgress();
  const mastered = DB.epochs.filter((e) => progress[e.id] && progress[e.id].best / progress[e.id].total >= 0.8).length;

  el.innerHTML = `
    <h1>Mehr</h1>
    <p class="muted">Weitere Bereiche der App, Einstellungen und Informationen.</p>

    <section class="section">
      <h2 class="section-title">Entdecken</h2>
      <div class="card-grid">
        <a class="card card-link hub-card" href="#/themen"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-topic"/></svg><span><span class="title">Querschnittsthemen</span><span class="sub">${plural(DB.themes.length, 'Thema', 'Themen')} quer durch alle Epochen</span></span></a>
        <a class="card card-link hub-card" href="#/glossar"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-glossary"/></svg><span><span class="title">Glossar</span><span class="sub">${plural(DB.glossary.length, 'Begriff', 'Begriffe')} kurz erklärt</span></span></a>
        <a class="card card-link hub-card" href="#/regionen"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-globe"/></svg><span><span class="title">Regionen</span><span class="sub">Geschichte nach Kontinenten</span></span></a>
        <a class="card card-link hub-card" href="#/suche"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-search"/></svg><span><span class="title">Suche</span><span class="sub">Alle Inhalte durchsuchen</span></span></a>
        <a class="card card-link hub-card" href="#/lesezeichen"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-bookmark"/></svg><span><span class="title">Lesezeichen</span><span class="sub">${plural(bookmarkCount(), 'Eintrag', 'Einträge')} gespeichert</span></span></a>
        <a class="card card-link hub-card" href="#/quiz"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-quiz"/></svg><span><span class="title">Quiz</span><span class="sub">${mastered} von ${DB.epochs.length} Epochen gemeistert</span></span></a>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Einstellungen</h2>
      <div class="card settings">
        <div class="setting-row">
          <span><span class="title">Farbschema</span><span class="sub" id="theme-label">${esc(themeLabel(getTheme()))}</span></span>
          <button type="button" class="btn btn-small" id="more-theme">Wechseln</button>
        </div>
        <div class="setting-row">
          <span><span class="title">Quiz-Fortschritt</span><span class="sub">Bestwerte und Versuche auf diesem Gerät</span></span>
          <button type="button" class="btn btn-small" id="more-reset">Zurücksetzen</button>
        </div>
        <div class="setting-row">
          <span><span class="title">Offline-Daten</span><span class="sub">Zwischengespeicherte App-Dateien erneuern</span></span>
          <button type="button" class="btn btn-small" id="more-refresh">Aktualisieren</button>
        </div>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Über die App</h2>
      <div class="card about">
        <p><strong>Weltgeschichte</strong> ist eine Lern-App für die wesentlichen Themen der Vergangenheit – von den ersten Menschen bis zur Gegenwart, auf allen Kontinenten.</p>
        <div class="stats-row">
          <div class="stat"><b>${DB.epochs.length}</b><span>Epochen</span></div>
          <div class="stat"><b>${DB.themes.length}</b><span>Themen</span></div>
          <div class="stat"><b>${DB.events.length}</b><span>Ereignisse</span></div>
          <div class="stat"><b>${DB.persons.length}</b><span>Personen</span></div>
          <div class="stat"><b>${DB.glossary.length}</b><span>Begriffe</span></div>
          <div class="stat"><b>${DB.quiz.length}</b><span>Quizfragen</span></div>
        </div>
        <p class="muted">Die Texte fassen den allgemein anerkannten Forschungsstand zusammen und sind für Schule, Studium und Allgemeinbildung gedacht. Jahreszahlen vor Christus sind mit „v. Chr.“ gekennzeichnet, ungefähre Angaben mit „ca.“. Lesezeichen und Quiz-Fortschritt bleiben nur auf diesem Gerät.</p>
        <p class="muted">Version ${esc(APP_VERSION)} · Progressive Web App · Funktioniert offline</p>
      </div>
    </section>
  `;

  el.querySelector('#more-theme').addEventListener('click', () => {
    const t = cycleTheme();
    el.querySelector('#theme-label').textContent = themeLabel(t);
  });
  el.querySelector('#more-reset').addEventListener('click', () => {
    if (confirm('Quiz-Fortschritt wirklich löschen?')) { resetQuizProgress(); showToast('Fortschritt zurückgesetzt'); render(el); }
  });
  el.querySelector('#more-refresh').addEventListener('click', async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      const regs = await navigator.serviceWorker?.getRegistrations?.() || [];
      await Promise.all(regs.map((r) => r.unregister()));
      showToast('Cache geleert – neu laden …');
      setTimeout(() => location.reload(), 600);
    } catch {
      location.reload();
    }
  });
}
