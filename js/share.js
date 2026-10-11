// Teilen: natives Teilen-Menü (App oder Browser), sonst Zwischenablage, sonst Kopierfeld.
import { WEB_URL } from './version.js';
import { showToast } from './ui.js';
import { t } from './i18n.js';

// Absoluter Link zu einer Route ("#/duell?d=…"); in den Apps auf die Web-Version.
export function appLink(hash) {
  const base = window.wgIsNative || !/^https?:$/.test(location.protocol)
    ? WEB_URL
    : location.origin + location.pathname;
  return base + hash;
}

export async function share({ title, text, url }) {
  const native = window.Capacitor?.Plugins?.Share;
  try {
    if (native?.share) { await native.share({ title, text, url, dialogTitle: title }); return 'shared'; }
    if (navigator.share) { await navigator.share({ title, text, url }); return 'shared'; }
  } catch (err) {
    if (err?.name === 'AbortError' || /cancel/i.test(err?.message || '')) return 'cancelled';
  }
  const full = [text, url].filter(Boolean).join('\n');
  try {
    await navigator.clipboard.writeText(full);
    showToast(t('share.copied'));
    return 'copied';
  } catch {
    window.prompt(t('share.copyPrompt'), full);
    return 'prompt';
  }
}
