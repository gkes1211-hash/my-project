// 문장제에 쓰는 이름·물건 목록과 한국어 조사 도우미.

export const NAMES = [
  '민준', '서연', '지우', '하린', '도윤', '서준', '하은', '예린',
  '시우', '유나', '준서', '다은', '지호', '채원', '은우', '소율',
];

// thing: 물건, counter: 세는 말, unit: 단위, prop: 무엇을 재는지
export const MEASURED_ITEMS = [
  { thing: '감자', counter: '봉지', unit: 'kg', prop: '무게' },
  { thing: '주스', counter: '병', unit: 'L', prop: '양' },
  { thing: '찰흙', counter: '덩어리', unit: 'kg', prop: '무게' },
  { thing: '우유', counter: '팩', unit: 'L', prop: '양' },
  { thing: '밀가루', counter: '봉지', unit: 'kg', prop: '무게' },
  { thing: '색 테이프', counter: '도막', unit: 'm', prop: '길이' },
  { thing: '리본', counter: '도막', unit: 'm', prop: '길이' },
  { thing: '쌀', counter: '봉지', unit: 'kg', prop: '무게' },
];

// 숫자 끝자리 읽는 소리에 받침이 있는지: 0영 1일 2이 3삼 4사 5오 6육 7칠 8팔 9구
const DIGIT_BATCHIM = [true, true, false, true, false, false, true, true, true, false];

export function hasBatchim(word) {
  const s = String(word).trim();
  const ch = s[s.length - 1];
  if (/\d/.test(ch)) return DIGIT_BATCHIM[Number(ch)];
  const c = ch.charCodeAt(0);
  if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28 !== 0;
  return false;
}

// particle('감자', '을/를') → '를' (조사만)
export function particle(word, pair) {
  const [withB, withoutB] = pair.split('/');
  return hasBatchim(word) ? withB : withoutB;
}

// josa('감자', '을/를') → '감자를'
export function josa(word, pair) {
  return `${word}${particle(word, pair)}`;
}

// ieyo('봉지') → '봉지예요', ieyo('병') → '병이에요'
export function ieyo(word) {
  return `${word}${hasBatchim(word) ? '이에요' : '예요'}`;
}
