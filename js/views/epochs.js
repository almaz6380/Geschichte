import { DB } from '../data.js';
import { epochTile, setTitle } from '../ui.js';

export function render(el) {
  setTitle('Epochen');
  el.innerHTML = `
    <h1>Epochen</h1>
    <p class="muted">Die Weltgeschichte in ${DB.epochs.length} Abschnitten, chronologisch geordnet. Jede Epoche enthält einen Überblick, Schlüsselereignisse, wichtige Personen und ihre Folgen.</p>
    <div class="card-grid">${DB.epochs.map((e, i) => epochTile(e, i + 1)).join('')}</div>
  `;
}
