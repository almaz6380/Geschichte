import { emptyState, setTitle } from '../ui.js';

export function render(el, params, ctx = {}) {
  setTitle('Nicht gefunden');
  el.innerHTML = emptyState('Seite nicht gefunden', ctx.message || 'Diese Seite existiert nicht.', '#/', 'Zur Startseite');
}
