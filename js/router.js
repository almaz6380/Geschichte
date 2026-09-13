// Einfacher Hash-Router: "#/epoche/rom?x=1" -> { path: ['epoche','rom'], query }
const routes = [];

export function parseHash(hash = location.hash) {
  let h = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!h.startsWith('/')) h = '/' + h;
  const qIndex = h.indexOf('?');
  const pathPart = qIndex >= 0 ? h.slice(0, qIndex) : h;
  const queryPart = qIndex >= 0 ? h.slice(qIndex + 1) : '';
  const path = pathPart.split('/').filter(Boolean).map(decodeURIComponent);
  return { path, query: new URLSearchParams(queryPart) };
}

// pattern: '/epoche/:slug'
export function addRoute(pattern, handler) {
  const parts = pattern.split('/').filter(Boolean);
  routes.push({ parts, handler });
}

export function matchRoute(path) {
  for (const r of routes) {
    if (r.parts.length !== path.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < r.parts.length; i++) {
      const p = r.parts[i];
      if (p.startsWith(':')) params[p.slice(1)] = path[i];
      else if (p !== path[i]) { ok = false; break; }
    }
    if (ok) return { handler: r.handler, params };
  }
  return null;
}

export function navigate(hash) {
  if (location.hash === hash) dispatch();
  else location.hash = hash;
}

export function setQuery(params, replace = true) {
  const { path } = parseHash();
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== '') qs.set(k, v);
  const q = qs.toString();
  const hash = '#/' + path.map(encodeURIComponent).join('/') + (q ? '?' + q : '');
  if (replace) history.replaceState(null, '', hash);
  else location.hash = hash;
}

let onNavigate = null;
export function startRouter(handler) {
  onNavigate = handler;
  window.addEventListener('hashchange', dispatch);
  dispatch();
}

function dispatch() {
  const { path, query } = parseHash();
  const m = matchRoute(path);
  onNavigate?.(m, { path, query });
}
