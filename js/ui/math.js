// 문제 글자를 화면용 HTML로 바꾼다.
// [[3/4]] → 분수, [[1 2/3]] → 대분수, 줄바꿈 → <br>
export const FRAC_PATTERN = /\[\[(?:(\d+|□) )?([^/\]\s]+)\/([^\]\s]+)\]\]/g;

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function renderMath(s) {
  return escapeHtml(s)
    .replace(
      FRAC_PATTERN,
      (_, w, n, d) =>
        `<span class="mf">${w ? `<span class="mf-w">${w}</span>` : ''}` +
        `<span class="mf-fr"><span class="mf-n">${n}</span><span class="mf-d">${d}</span></span></span>`,
    )
    .replace(/\n/g, '<br>');
}
