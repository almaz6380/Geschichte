import { DB } from '../data.js';
import { esc, epochTile, setTitle } from '../ui.js';
import { t } from '../i18n.js';

export function render(el) {
  setTitle(t('epochs.title'));
  el.innerHTML = `
    <h1>${esc(t('epochs.title'))}</h1>
    <p class="muted">${esc(t('epochs.intro', { count: DB.epochs.length }))}</p>
    <div class="card-grid">${DB.epochs.map((e, i) => epochTile(e, i + 1)).join('')}</div>
  `;
}
