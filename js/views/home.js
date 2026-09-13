import { DB, randomEvent } from '../data.js';
import { esc, epochTile, formatRange, regionChip, setTitle } from '../ui.js';
import { getQuizProgress, isInstallHintDismissed, dismissInstallHint } from '../store.js';

export function render(el, params, ctx) {
  setTitle('');
  const ev = randomEvent();
  const epoch = ev ? DB.epochsById.get(ev.epochId) : null;
  const progress = getQuizProgress();
  const mastered = DB.epochs.filter((e) => {
    const p = progress[e.id];
    return p && p.total && p.best / p.total >= 0.8;
  }).length;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const showIosHint = isIOS && !standalone && !isInstallHintDismissed();
  const showAndroidHint = !standalone && !isInstallHintDismissed() && window.wgInstall?.available();

  el.innerHTML = `
    <section class="intro">
      <h1>Weltgeschichte</h1>
      <p>Alle wesentlichen Themen der Vergangenheit – von den ersten Menschen bis zur Gegenwart. Lies Epochen-Artikel, erkunde die Zeitleiste, teste dein Wissen im Quiz.</p>
      <div class="stats-row">
        <div class="stat"><b>${DB.epochs.length}</b><span>Epochen</span></div>
        <div class="stat"><b>${DB.events.length}</b><span>Ereignisse</span></div>
        <div class="stat"><b>${DB.persons.length}</b><span>Personen</span></div>
        <div class="stat"><b>${DB.quiz.length}</b><span>Quizfragen</span></div>
      </div>
      <div class="btn-row">
        <a class="btn btn-primary" href="#/epochen">Epochen entdecken</a>
        <a class="btn" href="#/zeitleiste">Zeitleiste</a>
        <a class="btn" href="#/quiz">Quiz starten</a>
      </div>
    </section>

    ${showIosHint ? `
    <section class="card install-hint" id="ios-hint">
      <h3>Als App installieren</h3>
      <p class="muted">Tippe in Safari auf „Teilen“ und dann auf „Zum Home-Bildschirm“. Danach funktioniert die App auch offline.</p>
      <button type="button" class="btn btn-small" id="ios-hint-close">Ausblenden</button>
    </section>` : ''}
    ${showAndroidHint ? `
    <section class="card install-hint" id="ios-hint">
      <h3>Als App installieren</h3>
      <p class="muted">Installiere Weltgeschichte auf dem Startbildschirm. Die App funktioniert danach auch offline.</p>
      <div class="btn-row" style="margin-bottom:0"><button type="button" class="btn btn-primary btn-small" id="install-now">Installieren</button><button type="button" class="btn btn-small" id="ios-hint-close">Ausblenden</button></div>
    </section>` : ''}

    <div class="two-col">
      ${ev ? `
      <section class="card random-card" style="--epoch-color:${epoch?.color}">
        <div class="muted">Zufälliges Ereignis</div>
        <h3><a href="#/ereignis/${ev.id}">${esc(ev.title)}</a></h3>
        <div class="meta-row"><span class="chip">${esc(formatRange(ev.year, ev.endYear, ev.approx))}</span>${regionChip(ev.regionId)}</div>
        <p class="muted">${esc(ev.summary)}</p>
        <div class="btn-row"><a class="btn btn-small" href="#/ereignis/${ev.id}">Mehr lesen</a><button type="button" class="btn btn-small" id="random-again">Anderes Ereignis</button></div>
      </section>` : ''}
      <section class="card">
        <div class="muted">Dein Quiz-Fortschritt</div>
        <h3>${mastered} von ${DB.epochs.length} Epochen gemeistert</h3>
        <div class="progress" aria-label="Fortschritt"><span style="width:${DB.epochs.length ? Math.round((mastered / DB.epochs.length) * 100) : 0}%"></span></div>
        <p class="muted" style="margin-top:8px">Eine Epoche gilt als gemeistert, wenn du mindestens 80 % der Fragen richtig beantwortest.</p>
        <a class="btn btn-small" href="#/quiz">Zum Quiz</a>
      </section>
    </div>

    <section class="section">
      <div class="section-head"><h2>Epochen</h2><a href="#/epochen">Alle anzeigen</a></div>
      <div class="card-grid">${DB.epochs.map((e, i) => epochTile(e, i + 1)).join('')}</div>
    </section>
  `;

  el.querySelector('#random-again')?.addEventListener('click', () => render(el, params, ctx));
  el.querySelector('#install-now')?.addEventListener('click', () => window.wgInstall?.prompt());
  const onInstallable = () => { if (location.hash === '#/' || location.hash === '') render(el, params, ctx); };
  document.addEventListener('wg:installable', onInstallable, { once: true });
  el.querySelector('#ios-hint-close')?.addEventListener('click', () => {
    dismissInstallHint();
    el.querySelector('#ios-hint')?.remove();
  });
}
