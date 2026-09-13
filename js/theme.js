import { getTheme, setTheme } from './store.js';

const ORDER = ['system', 'light', 'dark'];
const LABEL = { system: 'Automatisch', light: 'Hell', dark: 'Dunkel' };

export function applyTheme(t = getTheme()) {
  const root = document.documentElement;
  if (t === 'light' || t === 'dark') root.dataset.theme = t;
  else delete root.dataset.theme;
  const btn = document.getElementById('theme-btn');
  if (btn) btn.title = `Farbschema: ${LABEL[t]} (klicken zum Wechseln)`;
}

export function cycleTheme() {
  const cur = getTheme();
  const next = ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length];
  setTheme(next);
  applyTheme(next);
  return next;
}

export function themeLabel(t = getTheme()) { return LABEL[t]; }
