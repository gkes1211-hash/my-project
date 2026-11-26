// 답 값을 비교하고 화면용 글자로 바꾼다.
// 값의 종류: 자연수(number), 분수(Frac), 소수(Dec), 여러 개(number[]),
//           가장 작은 수와 가장 큰 수({min, max}), 글자(부등호·객관식 보기)
// 화면용 글자에서 [[3/4]]는 분수, [[1 2/3]]은 대분수로 그려진다.
import { Frac } from '../core/fraction.js';
import { Dec } from '../core/decimal.js';

const isMinMax = (v) => v !== null && typeof v === 'object' && 'min' in v && 'max' in v;

function toFracValue(v) {
  if (v instanceof Frac) return v;
  if (v instanceof Dec) return v.toFrac();
  if (Number.isInteger(v)) return new Frac(v);
  throw new Error(`비교할 수 없는 값이에요: ${v}`);
}

const sortNums = (arr) => [...arr].sort((x, y) => toFracValue(x).cmp(toFracValue(y)));

export function sameValue(a, b) {
  if (a === null || b === null || a === undefined || b === undefined) return a === b;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    const sa = sortNums(a);
    const sb = sortNums(b);
    return sa.every((x, i) => sameValue(x, sb[i]));
  }
  if (isMinMax(a) || isMinMax(b)) {
    return isMinMax(a) && isMinMax(b) && sameValue(a.min, b.min) && sameValue(a.max, b.max);
  }
  if (typeof a === 'string' || typeof b === 'string') return a === b;
  return toFracValue(a).eq(toFracValue(b));
}

export function isPositive(v) {
  return toFracValue(v).n > 0;
}

export function formatValue(v) {
  if (v instanceof Frac) {
    if (v.d === 1) return String(v.n);
    if (v.n > v.d) {
      const m = v.toMixed();
      return `[[${m.whole} ${m.num}/${m.den}]]`;
    }
    return `[[${v.n}/${v.d}]]`;
  }
  if (Array.isArray(v)) return sortNums(v).map(formatValue).join(', ');
  if (isMinMax(v)) return `가장 작은 수 ${formatValue(v.min)}, 가장 큰 수 ${formatValue(v.max)}`;
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
