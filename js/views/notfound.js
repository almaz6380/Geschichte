import { emptyState, setTitle } from '../ui.js';
import { t } from '../i18n.js';

export function render(el, params, ctx = {}) {
  setTitle(t('notfound.title'));
  el.innerHTML = emptyState(t('notfound.heading'), ctx.message || t('notfound.text'), '#/', t('notfound.home'));
}
