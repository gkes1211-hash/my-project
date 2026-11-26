// 답 형식에 맞는 입력칸 (기획서 8번). 휴대폰에서 숫자 키패드가 뜨게 한다.
import { renderMath, escapeHtml as esc } from './math.js';

const NUM = 'inputmode="numeric" pattern="[0-9]*" autocomplete="off"';

export function answerInputHtml(p) {
  switch (p.answerType) {
    case 'fraction':
      return `
        <div class="answer-row">
          <input id="in-whole" ${NUM} aria-label="자연수 부분">
          <div class="frac-in">
            <input id="in-num" ${NUM} aria-label="분자">
            <div class="bar"></div>
            <input id="in-den" ${NUM} aria-label="분모">
          </div>
        </div>
        <p class="input-help">자연수 부분이 없으면 왼쪽 칸은 비워 두세요.</p>`;
    case 'decimal':
      return `<div class="answer-row"><input id="in-one" class="wide" inputmode="decimal" autocomplete="off" aria-label="답"></div>`;
    case 'multi':
      return `
        <div class="chips" id="chips" aria-live="polite"></div>
        <div class="answer-row">
          <input id="in-one" class="wide" ${NUM} aria-label="수 하나 입력">
          <button type="button" class="btn small" id="add-chip">넣기</button>
        </div>
        <p class="input-help">수를 하나씩 쓰고 ‘넣기’를 누르세요. 넣은 수를 누르면 빠져요.</p>`;
    case 'minmax':
      return `
        <div class="minmax">
          <label>가장 작은 수 <input id="in-min" ${NUM}></label>
          <label>가장 큰 수 <input id="in-max" ${NUM}></label>
        </div>`;
    case 'compare':
      return `<div class="choices row" role="radiogroup" aria-label="부등호">
        ${p.options.map((o) => `<button type="button" class="choice sym" role="radio" aria-checked="false" data-value="${esc(o)}">${esc(o)}</button>`).join('')}
      </div>`;
    case 'choice':
      return `<div class="choices" role="radiogroup" aria-label="보기">
        ${p.options.map((o, i) => `<button type="button" class="choice" role="radio" aria-checked="false" data-value="${esc(o)}"><span class="choice-no">${'①②③④⑤⑥'[i]}</span> ${renderMath(o)}</button>`).join('')}
      </div>`;
    default:
      return `<div class="answer-row"><input id="in-one" class="wide" ${NUM} aria-label="답"></div>`;
  }
}

// 입력칸에 필요한 동작을 붙인다. onSubmit: 엔터를 눌렀을 때
export function wireInputs(root, p, onSubmit) {
  root.querySelectorAll('.answer-row input, .minmax input').forEach((inp) =>
    inp.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (p.answerType === 'multi' && inp.value.trim()) addChip(root);
      else onSubmit();
    }),
  );
  root.querySelectorAll('.choice').forEach((btn) =>
    btn.addEventListener('click', () => {
      root.querySelectorAll('.choice').forEach((b) => b.setAttribute('aria-checked', 'false'));
      btn.setAttribute('aria-checked', 'true');
    }),
  );
  if (p.answerType === 'multi') {
    root.querySelector('#add-chip').addEventListener('click', () => addChip(root));
    root.querySelector('#chips').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip-num');
      if (chip) chip.remove();
    });
  }
}

function addChip(root) {
  const inp = root.querySelector('#in-one');
  const v = inp.value.trim();
  if (/^\d+$/.test(v)) {
    const chips = root.querySelector('#chips');
    const exists = [...chips.querySelectorAll('.chip-num')].some((c) => c.dataset.value === String(Number(v)));
    if (!exists) chips.insertAdjacentHTML('beforeend', `<button type="button" class="chip-num" data-value="${Number(v)}">${Number(v)} ✕</button>`);
  }
  inp.value = '';
  inp.focus();
}

export function readInput(root, p) {
  const val = (id) => root.querySelector(`#${id}`)?.value ?? '';
  switch (p.answerType) {
    case 'fraction':
      return { whole: val('in-whole'), num: val('in-num'), den: val('in-den') };
    case 'minmax':
      return { min: val('in-min'), max: val('in-max') };
    case 'compare':
    case 'choice':
      return root.querySelector('.choice[aria-checked="true"]')?.dataset.value ?? '';
    case 'multi': {
      const chips = [...root.querySelectorAll('.chip-num')].map((c) => c.dataset.value);
      const pending = val('in-one').trim();
      return [...chips, pending].filter(Boolean).join(',');
    }
    default:
      return val('in-one');
  }
}
