// 어림하기: 올림(up), 버림(down), 반올림(half). 0 이상의 수만 다룬다.
import { Dec } from './decimal.js';

export const MODES = { up: '올림', down: '버림', half: '반올림' };
export const MODE_KEYS = ['up', 'down', 'half'];

const PLACE_NAMES = { 1: '일의 자리', 10: '십의 자리', 100: '백의 자리', 1000: '천의 자리', 10000: '만의 자리' };
const DEC_PLACE_NAMES = { 0: '일의 자리', 1: '소수 첫째 자리', 2: '소수 둘째 자리', 3: '소수 셋째 자리' };

export function placeName(unit) {
  return PLACE_NAMES[unit];
}

export function decPlaceName(places) {
  return DEC_PLACE_NAMES[places];
}

// 자연수 n을 unit(10, 100, ...) 자리까지 어림 — 나눗셈으로 계산
export function roundInt(n, unit, mode) {
  const q = Math.floor(n / unit);
  const r = n % unit;
  if (mode === 'down') return q * unit;
  if (mode === 'up') return r ? (q + 1) * unit : n;
  return r * 2 >= unit ? (q + 1) * unit : q * unit;
}

// 같은 어림을 숫자 글자를 직접 보고 계산 — 정답을 다른 방법으로 확인할 때 쓴다.
export function roundIntByDigits(n, unit, mode) {
  const k = String(unit).length - 1; // 버릴 아래 자리 개수
  const s = String(n).padStart(k + 1, '0');
  const head = Number(s.slice(0, s.length - k));
  const tail = s.slice(s.length - k);
  const keep = head * unit;
  if (mode === 'down') return keep;
  if (mode === 'up') return /[1-9]/.test(tail) ? keep + unit : keep;
  return Number(tail[0]) >= 5 ? keep + unit : keep;
}

// n에서 unit 자리 아래 숫자들 (글자)
export function lowerDigits(n, unit) {
  const k = String(unit).length - 1;
  return String(n).padStart(k + 1, '0').slice(-k);
}

// 소수 d를 소수 places 자리까지 어림
export function roundDec(d, places, mode) {
  if (d.scale <= places) return d;
  const factor = 10 ** (d.scale - places);
  const q = Math.floor(d.units / factor);
  const r = d.units % factor;
  let v = q;
  if (mode === 'up' && r) v = q + 1;
  if (mode === 'half' && r * 2 >= factor) v = q + 1;
  return new Dec(v * 1, places);
}

// 소수 어림을 글자로 계산 (확인용)
export function roundDecByDigits(d, places, mode) {
  const [ip, fp = ''] = d.toString().split('.');
  const frac = fp.padEnd(places + 1, '0');
  const kept = Dec.of(places ? `${ip}.${frac.slice(0, places)}` : ip);
  const tail = frac.slice(places);
  const step = new Dec(1, places);
  if (mode === 'down') return kept;
  if (mode === 'up') return /[1-9]/.test(tail) ? kept.add(step) : kept;
  return Number(tail[0]) >= 5 ? kept.add(step) : kept;
}

// 반올림할 때 바로 아래 자리가 아니라 맨 끝 숫자를 보고 정하는 실수
export function roundIntByLastDigit(n, unit) {
  const down = roundInt(n, unit, 'down');
  return n % 10 >= 5 ? down + unit : down;
}

export function roundDecByLastDigit(d, places) {
  const down = roundDec(d, places, 'down');
  const last = Math.abs(d.units) % 10;
  return last >= 5 ? down.add(new Dec(1, places)) : down;
}

export const MODE_RULE = {
  up: '구하려는 자리 아래에 0이 아닌 숫자가 하나라도 있으면 구하려는 자리 숫자를 1 크게 하고, 아래 자리는 모두 0으로 나타내요.',
  down: '구하려는 자리 아래 수를 모두 버려서 0으로 나타내요.',
  half: '구하려는 자리 바로 아래 숫자가 0, 1, 2, 3, 4이면 버리고, 5, 6, 7, 8, 9이면 올려요.',
};

export const MODE_CONCEPT = {
  up:
    '올림은 구하려는 자리 아래 수를 올려서 나타내는 방법이에요. 아래 자리에 0이 아닌 숫자가 하나라도 있으면 구하려는 자리 숫자를 1 크게 하고, 아래 자리는 모두 0으로 써요. ' +
    '예를 들어 3214를 올림하여 백의 자리까지 나타내면 3300이에요. 아래 자리가 모두 0이면 그대로예요. (3200 → 3200)',
  down:
    '버림은 구하려는 자리 아래 수를 모두 버려서 0으로 나타내는 방법이에요. ' +
    '예를 들어 3287을 버림하여 백의 자리까지 나타내면 3200이에요. 아래 숫자가 아무리 커도 버려요.',
  half:
    '반올림은 구하려는 자리 바로 아래 숫자만 보고 정해요. 그 숫자가 0, 1, 2, 3, 4이면 버리고, 5, 6, 7, 8, 9이면 올려요. ' +
    '예를 들어 반올림하여 백의 자리까지 나타내면 3249 → 3200, 3250 → 3300이에요. 맨 끝 숫자가 아니라 바로 아래 숫자를 봐야 해요.',
};
