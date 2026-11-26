// 채점: 아이가 입력한 답을 정답과 비교한다.
// 결과(result):
//   'correct' 정답
//   'form'    값은 맞지만 약분·대분수 표현이 덜 됨 (틀림으로 치지 않고 따로 안내)
//   'wrong'   틀림 (value에 아이 답의 값이 들어 있어 원인 진단에 쓴다)
//   'invalid' 답을 읽을 수 없음 (빈칸, 0인 분모 등)
import { Frac, gcd } from '../core/fraction.js';
import { Dec } from '../core/decimal.js';
import { sameValue } from './values.js';

const invalid = (message) => ({ result: 'invalid', message });

function readInt(s) {
  const t = String(s ?? '').trim();
  if (t === '') return null;
  if (!/^\d+$/.test(t)) return NaN;
  return Number(t);
}

export function grade(problem, input) {
  switch (problem.answerType) {
    case 'natural':
      return gradeNatural(problem.answer, input);
    case 'fraction':
      return gradeFraction(problem.answer, input);
    case 'decimal':
      return gradeDecimal(problem.answer, input);
    default:
      throw new Error(`모르는 답 형식: ${problem.answerType}`);
  }
}

function gradeNatural(answer, input) {
  const v = readInt(input);
  if (v === null) return invalid('답을 입력해 주세요.');
  if (Number.isNaN(v)) return invalid('숫자만 입력해 주세요.');
  return v === answer ? { result: 'correct', value: v } : { result: 'wrong', value: v };
}

function gradeDecimal(answer, input) {
  if (String(input ?? '').trim() === '') return invalid('답을 입력해 주세요.');
  const v = Dec.parse(input);
  if (!v) return invalid('소수를 바르게 입력해 주세요. (예: 2.35)');
  return sameValue(v, answer) ? { result: 'correct', value: v } : { result: 'wrong', value: v };
}

// input: { whole, num, den } (글자)
function gradeFraction(answer, input) {
  const whole = readInt(input.whole);
  const num = readInt(input.num);
  const den = readInt(input.den);
  if ([whole, num, den].some(Number.isNaN)) return invalid('칸에는 숫자만 입력해 주세요.');
  if (whole === null && num === null && den === null) return invalid('답을 입력해 주세요.');
  if ((num === null) !== (den === null)) return invalid('분자와 분모를 모두 써 주세요.');
  if (den === 0) return invalid('분모에는 0을 쓸 수 없어요.');

  const w = whole ?? 0;
  const value = num === null ? new Frac(w) : Frac.mixed(w, num, den);
  if (!sameValue(value, answer)) return { result: 'wrong', value };

  // 값은 맞음 → 표현을 확인한다.
  if (num === null || num === 0) return { result: 'correct', value };
  if (num % den === 0) {
    return { result: 'form', cause: 'reduce', value, message: '값은 맞았어요. 자연수로 나타내 볼까요?' };
  }
  const notReduced = gcd(num, den) > 1;
  const improper = num > den;
  if (notReduced && improper) {
    return { result: 'form', cause: 'reduce', value, message: '값은 맞았어요. 약분을 끝까지 하고, 대분수로 바꿔 볼까요?' };
  }
  if (notReduced) {
    return { result: 'form', cause: 'reduce', value, message: '값은 맞았어요. 약분을 끝까지 했나요?' };
  }
  if (improper) {
    return { result: 'form', cause: 'reduce', value, message: '값은 맞았어요. 가분수를 대분수로 바꿔 볼까요?' };
  }
  return { result: 'correct', value };
}
