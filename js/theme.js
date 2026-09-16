import { getTheme, setTheme } from './store.js';
import { t } from './i18n.js';

const ORDER = ['system', 'light', 'dark'];
const LABEL_KEY = { system: 'theme.label.system', light: 'theme.label.light', dark: 'theme.label.dark' };

export function applyTheme(scheme = getTheme()) {
  const root = document.documentElement;
  if (scheme === 'light' || scheme === 'dark') root.dataset.theme = scheme;
  else delete root.dataset.theme;
  const btn = document.getElementById('theme-btn');
  if (btn) btn.title = t('theme.buttonTitle', { name: themeLabel(scheme) });
}

export function cycleTheme() {
  const cur = getTheme();
  const next = ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length];
  setTheme(next);
  applyTheme(next);
  return next;
}

export function themeLabel(scheme = getTheme()) { return t(LABEL_KEY[scheme] || LABEL_KEY.system); }
