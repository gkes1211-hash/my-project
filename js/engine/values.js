// 답 값(자연수, 분수, 소수)을 비교하고 화면용 글자로 바꾼다.
// 화면용 글자에서 [[3/4]]는 분수, [[1 2/3]]은 대분수로 그려진다.
import { Frac } from '../core/fraction.js';
import { Dec } from '../core/decimal.js';

export function sameValue(a, b) {
  if (a instanceof Frac || b instanceof Frac) return toFracValue(a).eq(toFracValue(b));
  if (a instanceof Dec || b instanceof Dec) return toFracValue(a).eq(toFracValue(b));
  return a === b;
}

function toFracValue(v) {
  if (v instanceof Frac) return v;
  if (v instanceof Dec) return v.toFrac();
  if (Number.isInteger(v)) return new Frac(v);
  throw new Error(`비교할 수 없는 값이에요: ${v}`);
}

export function isPositive(v) {
  return toFracValue(v).n > 0;
}

// 기약분수·대분수 형태의 화면용 글자
export function formatValue(v) {
  if (v instanceof Frac) {
    if (v.d === 1) return String(v.n);
    if (v.n > v.d) {
      const m = v.toMixed();
      return `[[${m.whole} ${m.num}/${m.den}]]`;
    }
    return `[[${v.n}/${v.d}]]`;
  }
  return String(v);
}

// 약분 전 분수 n/d 에서 시작해 약분 → 대분수까지의 단계
// fracChain(12, 8) → ['[[12/8]]', '[[3/2]]', '[[1 1/2]]']
export function fracChain(n, d) {
  const steps = [`[[${n}/${d}]]`];
  const f = new Frac(n, d);
  if (f.n !== n || f.d !== d) steps.push(f.d === 1 ? String(f.n) : `[[${f.n}/${f.d}]]`);
  if (f.d !== 1 && f.n > f.d) steps.push(formatValue(f));
  return steps;
}
