// localStorage-Wrapper mit Namespace "wg." und Fehlertoleranz (z. B. privater Modus).
const PREFIX = 'wg.';
const memory = new Map();

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return memory.has(key) ? memory.get(key) : fallback;
  }
}

function write(key, value) {
  memory.set(key, value);
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* Speicher nicht verfügbar – nur im Speicher halten */
  }
}

const listeners = new Set();
function emit(key) { for (const fn of listeners) fn(key); }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// Theme
export function getTheme() { return read('theme', 'system'); }
export function setTheme(t) { write('theme', t); emit('theme'); }

// Lesezeichen: { epoch: [], event: [], person: [] }
const EMPTY_BM = () => ({ epoch: [], event: [], person: [] });
export function getBookmarks() {
  const bm = read('bookmarks', null);
  return bm && typeof bm === 'object' ? { ...EMPTY_BM(), ...bm } : EMPTY_BM();
}
export function isBookmarked(type, id) { return getBookmarks()[type]?.includes(id) ?? false; }
export function toggleBookmark(type, id) {
  const bm = getBookmarks();
  const list = bm[type] || [];
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1); else list.push(id);
  bm[type] = list;
  write('bookmarks', bm);
  emit('bookmarks');
  return i < 0;
}
export function bookmarkCount() {
  const bm = getBookmarks();
  return bm.epoch.length + bm.event.length + bm.person.length;
}

// Quiz-Fortschritt: { [mode]: { best, total, attempts, lastScore, lastAt } }
export function getQuizProgress() { return read('quiz.progress', {}); }
export function saveQuizResult(mode, correct, total) {
  const all = getQuizProgress();
  const old = all[mode] || { best: 0, total, attempts: 0, lastScore: 0, lastAt: null };
  all[mode] = {
    best: Math.max(old.best, correct),
    total,
    attempts: old.attempts + 1,
    lastScore: correct,
    lastAt: new Date().toISOString(),
  };
  write('quiz.progress', all);
  emit('quiz');
  return all[mode];
}
export function resetQuizProgress() { write('quiz.progress', {}); emit('quiz'); }

// Zeitleisten-Filter merken
export function getTimelineFilters() { return read('timeline.filters', { epoch: '', region: '' }); }
export function setTimelineFilters(f) { write('timeline.filters', f); }

// Install-Hinweis ausgeblendet?
export function isInstallHintDismissed() { return read('install.dismissed', false); }
export function dismissInstallHint() { write('install.dismissed', true); }
