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
    case 'multi':
      return gradeMulti(problem.answer, input);
    case 'minmax':
      return gradeMinMax(problem.answer, input);
    case 'compare':
    case 'choice':
      return gradeChoice(problem, input);
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

// 여러 개: "3, 5, 7"처럼 쉼표나 띄어쓰기로 구분. 순서는 상관없다.
// 빠진 수와 들어가면 안 되는 수가 몇 개인지 따로 알려 준다. (기획서 8번)
function gradeMulti(answer, input) {
  const tokens = String(input ?? '')
    .split(/[\s,，、]+/)
    .filter(Boolean);
  if (tokens.length === 0) return invalid('답을 입력해 주세요. 여러 개는 쉼표(,)로 구분해요.');
  if (tokens.some((t) => !/^\d+$/.test(t))) return invalid('자연수만 쉼표(,)로 구분해서 입력해 주세요.');
  const given = [...new Set(tokens.map(Number))].sort((a, b) => a - b);
  const want = new Set(answer);
  const missing = answer.filter((x) => !given.includes(x)).length;
  const extra = given.filter((x) => !want.has(x)).length;
  if (!missing && !extra) return { result: 'correct', value: given };
  const parts = [];
  if (missing) parts.push(`빠진 수가 ${missing}개 있어요.`);
  if (extra) parts.push(`들어가면 안 되는 수가 ${extra}개 있어요.`);
  return { result: 'wrong', value: given, message: parts.join(' ') };
}

// 가장 작은 수와 가장 큰 수: input { min, max }
function gradeMinMax(answer, input) {
  const min = readInt(input.min);
  const max = readInt(input.max);
  if (min === null || max === null) return invalid('가장 작은 수와 가장 큰 수를 모두 써 주세요.');
  if (Number.isNaN(min) || Number.isNaN(max)) return invalid('자연수만 입력해 주세요.');
  const value = { min, max };
  const okMin = min === answer.min;
  const okMax = max === answer.max;
  if (okMin && okMax) return { result: 'correct', value };
  let message = '';
  if (okMin) message = '가장 작은 수는 맞았어요. 가장 큰 수를 다시 볼까요?';
  if (okMax) message = '가장 큰 수는 맞았어요. 가장 작은 수를 다시 볼까요?';
  return { result: 'wrong', value, message };
}

// 부등호·객관식: input은 고른 보기 글자
function gradeChoice(problem, input) {
  if (!input) return invalid(problem.answerType === 'compare' ? '>, =, < 중에서 골라 주세요.' : '보기에서 하나를 골라 주세요.');
  if (!problem.options.includes(input)) return invalid('보기에서 하나를 골라 주세요.');
  return input === problem.answer ? { result: 'correct', value: input } : { result: 'wrong', value: input };
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
