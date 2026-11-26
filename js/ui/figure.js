// 그림 정보를 화면에 그린다. (기획서 10번)
import { escapeHtml as esc } from './math.js';

export function renderFigure(fig) {
  if (!fig) return '';
  if (fig.type === 'numberline') return numberLine(fig);
  if (fig.type === 'cards') return `<div class="fig-cards">${fig.cards.map((c) => `<span class="num-card">${c}</span>`).join('')}</div>`;
  if (fig.type === 'table') return table(fig);
  return '';
}

// 수직선: ●는 그 수를 포함(이상·이하), ○는 포함하지 않음(초과·미만)
function numberLine({ min, max, from, to }) {
  const W = 340;
  const L = 22;
  const R = W - 22;
  const Y = 34;
  const x = (v) => L + ((v - min) * (R - L)) / (max - min);
  const parts = [];
  parts.push(`<line class="nl-axis" x1="6" y1="${Y}" x2="${W - 6}" y2="${Y}" />`);
  for (let v = min; v <= max; v++) {
    parts.push(`<line class="nl-axis" x1="${x(v)}" y1="${Y - 6}" x2="${x(v)}" y2="${Y + 6}" />`);
    parts.push(`<text class="nl-label" x="${x(v)}" y="${Y + 26}" text-anchor="middle">${v}</text>`);
  }
  const x1 = from ? x(from.v) : 6;
  const x2 = to ? x(to.v) : W - 6;
  parts.push(`<line class="nl-range" x1="${x1}" y1="${Y}" x2="${x2}" y2="${Y}" />`);
  if (!from) parts.push(`<polygon class="nl-arrow" points="2,${Y} 14,${Y - 7} 14,${Y + 7}" />`);
  if (!to) parts.push(`<polygon class="nl-arrow" points="${W - 2},${Y} ${W - 14},${Y - 7} ${W - 14},${Y + 7}" />`);
  for (const end of [from, to]) {
    if (end) parts.push(`<circle class="nl-dot ${end.closed ? 'closed' : 'open'}" cx="${x(end.v)}" cy="${Y}" r="7" />`);
  }
  const desc = [from && `${from.v}에 ${from.closed ? '●' : '○'}`, to && `${to.v}에 ${to.closed ? '●' : '○'}`].filter(Boolean).join(', ');
  return `<div class="fig-line"><svg viewBox="0 0 ${W} 72" role="img" aria-label="수직선: ${esc(desc)}">${parts.join('')}</svg></div>`;
}

function table({ head, rows }) {
  return `<div class="fig-table-wrap"><table class="fig-table">
    <thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}
