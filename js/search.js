// DOM-freie Suche: Normalisierung, Index, Ranking.

export function normalize(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function tokenize(s) {
  return normalize(s).split(' ').filter((t) => t.length >= 2);
}

// db: { epochs, events, persons }
export function buildIndex(db) {
  const docs = [];
  for (const e of db.epochs) {
    docs.push({
      type: 'epoch', id: e.id, title: e.title, year: e.start,
      titleN: normalize(e.title),
      textN: normalize([e.summary, ...(e.overview || []), ...(e.consequences || [])].join(' ')),
      tagsN: (e.tags || []).map(normalize),
      snippetSrc: [e.summary, ...(e.overview || [])].join(' '),
    });
  }
  for (const ev of db.events) {
    docs.push({
      type: 'event', id: ev.id, title: ev.title, year: ev.year, epochId: ev.epochId,
      titleN: normalize(ev.title),
      textN: normalize([ev.summary, ev.text].join(' ')),
      tagsN: (ev.tags || []).map(normalize),
      snippetSrc: [ev.summary, ev.text].join(' '),
    });
  }
  for (const p of db.persons) {
    docs.push({
      type: 'person', id: p.id, title: p.name, year: p.born, epochId: p.epochId,
      titleN: normalize(p.name),
      textN: normalize([p.role, p.summary, p.text].join(' ')),
      tagsN: (p.tags || []).map(normalize),
      snippetSrc: [p.role, p.summary, p.text].join(' '),
    });
  }
  return docs;
}

function scoreDoc(doc, tokens) {
  let score = 0;
  let hits = 0;
  const titleWords = doc.titleN.split(' ');
  for (const t of tokens) {
    let s = 0;
    if (titleWords.includes(t)) s = 10;
    else if (titleWords.some((w) => w.startsWith(t))) s = 7;
    else if (doc.titleN.includes(t)) s = 5;
    if (doc.tagsN.some((tag) => tag === t || tag.split(' ').includes(t))) s = Math.max(s, 4);
    else if (doc.tagsN.some((tag) => tag.includes(t))) s = Math.max(s, 3);
    if (s === 0 && doc.textN.includes(t)) s = 2;
    if (s > 0) hits++;
    score += s;
  }
  if (hits === tokens.length && tokens.length > 1) score += 3;
  if (hits < tokens.length) score = Math.floor(score / 2);
  if (doc.type === 'epoch') score += 1;
  // Bei Namenssuche Personen leicht bevorzugen (Titeltreffer).
  if (doc.type === 'person' && tokens.some((t) => titleWords.includes(t))) score += 1;
  return hits === 0 ? 0 : score;
}

export function search(index, query, limit = 50) {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const results = [];
  for (const doc of index) {
    const score = scoreDoc(doc, tokens);
    if (score > 0) results.push({ doc, score });
  }
  results.sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title, 'de'));
  return results.slice(0, limit).map((r) => ({ ...r, tokens }));
}

// Liefert ein Textstück um den ersten Treffer, Trefferworte mit <mark> markiert (Eingabe muss escaped werden).
export function makeSnippet(text, tokens, esc = (s) => s, radius = 70) {
  const plain = String(text ?? '');
  const lower = normalize(plain);
  // Mapping über normalisierten Text ist ungenau bei Umlauten; daher einfache Wort-Suche im Original.
  const words = plain.split(/(\s+)/);
  let firstIdx = -1;
  const isHit = (w) => {
    const n = normalize(w);
    return n && tokens.some((t) => n.startsWith(t) || n.includes(t));
  };
  for (let i = 0; i < words.length; i++) if (isHit(words[i])) { firstIdx = i; break; }
  if (firstIdx < 0) return esc(plain.slice(0, radius * 2)) + (plain.length > radius * 2 ? ' …' : '');
  // Fenster in Zeichen
  const before = words.slice(0, firstIdx).join('');
  const start = Math.max(0, before.length - radius);
  const end = Math.min(plain.length, before.length + radius * 2);
  const chunk = plain.slice(start, end);
  const marked = chunk.split(/(\s+)/).map((w) => (isHit(w) ? `<mark>${esc(w)}</mark>` : esc(w))).join('');
  void lower;
  return (start > 0 ? '… ' : '') + marked + (end < plain.length ? ' …' : '');
}
