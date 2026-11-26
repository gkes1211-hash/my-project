// 화면 점검용 도우미. 주소 끝에 ?debug 를 붙였을 때만 불러온다. (아이가 쓰는 화면에는 영향 없음)
// window.__debug.fill(true)  → 정답을 입력칸에 넣기
// window.__debug.fill(false) → 오답 패턴 값(없으면 아무 오답)을 넣기
import { Frac } from '../core/fraction.js';
import { getPlay } from './play.js';

function setVal(id, v) {
  const el = document.getElementById(id);
  if (el) el.value = String(v);
}

function fillValue(p, v) {
  switch (p.answerType) {
    case 'fraction': {
      const f = v instanceof Frac ? v : new Frac(v);
      const m = f.toMixed();
      setVal('in-whole', m.whole || '');
      setVal('in-num', m.num || '');
      setVal('in-den', m.num ? m.den : '');
      break;
    }
    case 'multi':
      for (const x of v) {
        setVal('in-one', x);
        document.getElementById('add-chip').click();
      }
      break;
    case 'minmax':
      setVal('in-min', v.min);
      setVal('in-max', v.max);
      break;
    case 'compare':
    case 'choice':
      [...document.querySelectorAll('.choice')].find((b) => b.dataset.value === v)?.click();
      break;
    default:
      setVal('in-one', v);
  }
}

function wrongValue(p) {
  if (p.mistakes.length) return p.mistakes[0].value;
  switch (p.answerType) {
    case 'compare':
    case 'choice':
      return p.options.find((o) => o !== p.answer);
    case 'multi':
      return [...p.answer, 99999];
    case 'minmax':
      return { min: p.answer.min + 1, max: p.answer.max };
    case 'fraction':
      return p.answer.add(1);
    default:
      return String(Number(String(p.answer)) + 1);
  }
}

window.__debug = {
  play: getPlay,
  fill(correct) {
    const p = getPlay().problem;
    fillValue(p, correct ? p.answer : wrongValue(p));
  },
};
