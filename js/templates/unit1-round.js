// 1단원 수의 범위와 어림하기 — 소단원 4~7 (올림, 버림, 반올림, 활용)
import { Dec } from '../core/decimal.js';
import {
  MODES, MODE_KEYS, MODE_RULE, MODE_CONCEPT,
  roundInt, roundIntByDigits, roundIntByLastDigit, lowerDigits, placeName,
  roundDec, roundDecByDigits, roundDecByLastDigit, decPlaceName,
} from '../core/rounding.js';
import { NAMES, josa, particle, ieyo } from '../core/words.js';
import { defineTemplate } from '../engine/template.js';

const SUB_OF = { up: 4, down: 5, half: 6 };
const otherModes = (mode) => MODE_KEYS.filter((m) => m !== mode);
const cmp = (a, b) => (a > b ? '>' : a < b ? '<' : '=');

// 자릿수를 하나 옮긴 자리 (자리를 잘못 읽은 실수)
const otherUnit = (unit) => (unit >= 1000 ? unit / 10 : unit * 10);

function digitsRange(rng, digits) {
  return rng.int(10 ** (digits - 1), 10 ** digits - 1);
}

// 구하려는 자리 숫자를 9로 만들어 받아올림이 생기는 문제 (도전 난이도)
function forceCarry(rng, n, unit, mode) {
  const s = String(n).split('');
  const k = String(unit).length - 1;
  const idx = s.length - 1 - k;
  if (idx <= 0) return n;
  s[idx] = '9';
  if (mode === 'half') s[idx + 1] = String(rng.int(5, 9));
  if (mode === 'up') s[s.length - 1] = String(rng.int(1, 9));
  return Number(s.join(''));
}

function natMistakes(mode) {
  const list = otherModes(mode).map((m) => ({
    id: `mode-${m}`,
    cause: 'concept',
    optional: true,
    value: ({ n, unit }) => roundInt(n, unit, m),
    explain: () => `${MODES[m]}을 했어요. ${MODES[mode]}은 ${MODE_RULE[mode]}`,
  }));
  list.push({
    id: 'wrong-place',
    cause: 'condition',
    optional: true,
    value: ({ n, unit }) => roundInt(n, otherUnit(unit), mode),
    explain: ({ unit }) => `${placeName(unit)}가 아니라 ${placeName(otherUnit(unit))}까지 나타냈어요. 어느 자리까지 나타내는지 다시 읽어요.`,
  });
  if (mode === 'half') {
    list.push({
      id: 'last-digit',
      cause: 'concept',
      optional: true,
      value: ({ n, unit }) => roundIntByLastDigit(n, unit),
      explain: () => '맨 끝 숫자를 보고 정했어요. 반올림은 구하려는 자리 바로 아래 숫자 하나만 봐요.',
    });
  }
  return list;
}

function natReason(n, unit, mode) {
  const lower = lowerDigits(n, unit);
  if (mode === 'down') return '아래 수를 모두 버려요';
  if (mode === 'up') return /[1-9]/.test(lower) ? '0이 아닌 숫자가 있으므로 올려요' : '아래 수가 모두 0이라 그대로예요';
  return Number(lower[0]) >= 5 ? `바로 아래 숫자 ${lower[0]}${particle(lower[0], '이/가')} 5 이상이므로 올려요` : `바로 아래 숫자 ${lower[0]}${particle(lower[0], '이/가')} 5보다 작으므로 버려요`;
}

function natHints(mode) {
  return [
    ({ n, unit }) => `‘${MODES[mode]}하여 ${placeName(unit)}까지’를 다시 확인해 볼까요? ${n}에서 ${placeName(unit)} 숫자에 밑줄을 그어 봐요.`,
    ({ n, unit }) => `${placeName(unit)} 아래 숫자는 ${ieyo(lowerDigits(n, unit))}. ${MODE_RULE[mode]}`,
    ({ n, unit }) => {
      const down = roundInt(n, unit, 'down');
      return `따라 풀어 봐요.\n아래 수를 버리면: ${down}\n${placeName(unit)} 숫자를 1 크게 하면: ${down + unit}\n${MODES[mode]}하면 둘 중 어느 쪽일까요? → □`;
    },
  ];
}

function natSolution({ n, unit }, mode) {
  return [`${n}의 ${placeName(unit)} 아래 숫자: ${lowerDigits(n, unit)}`, `${natReason(n, unit, mode)} → ${roundInt(n, unit, mode)}`];
}

function makeNat(rng, level, mode) {
  const R = { 1: [3, [10]], 2: [4, [10, 100]], 3: [5, [100, 1000]], 4: [6, [1000, 10000]] }[level];
  for (;;) {
    const unit = rng.pick(R[1]);
    let n = digitsRange(rng, R[0]);
    if (level === 4 && rng.chance(0.5)) n = forceCarry(rng, n, unit, mode);
    if (n % unit !== 0) return { n, unit };
  }
}

// ── 자연수 어림 ──────────────────────────────────────

function natTemplate(mode) {
  return defineTemplate({
    id: `u1-${SUB_OF[mode]}-nat`,
    unit: 1,
    sub: SUB_OF[mode],
    style: 'A',
    styleName: '기본 계산',
    levels: [1, 2, 3, 4],
    answerType: 'natural',
    make: (rng, level) => makeNat(rng, level, mode),
    text: ({ n, unit }) => `${n}${particle(n, '을/를')} ${MODES[mode]}하여 ${placeName(unit)}까지 나타내세요.`,
    answer: ({ n, unit }) => roundInt(n, unit, mode),
    verify: ({ n, unit }, ans) => roundIntByDigits(n, unit, mode) === ans,
    mistakes: natMistakes(mode),
    hints: natHints(mode),
    concept: MODE_CONCEPT[mode],
    solution: (p) => natSolution(p, mode),
  });
}

// ── 소수 어림 ────────────────────────────────────────

function makeDec(rng, level, mode) {
  const R = { 1: [1, [0]], 2: [2, [1]], 3: [3, [1, 2]], 4: [3, [0, 1, 2]] }[level];
  const scale = R[0];
  for (;;) {
    const places = rng.pick(R[1]);
    let units = rng.int(10 ** scale + 1, 10 ** (scale + 2) - 1);
    if (level === 4 && rng.chance(0.5)) units = forceCarry(rng, units, 10 ** (scale - places), mode);
    if (units % 10 === 0) continue;
    return { d: new Dec(units, scale).toString(), places };
  }
}

function decTemplate(mode) {
  const lower = (d, places) => (d.split('.')[1] ?? '').slice(places);
  return defineTemplate({
    id: `u1-${SUB_OF[mode]}-dec`,
    unit: 1,
    sub: SUB_OF[mode],
    style: 'A',
    styleName: '소수 어림',
    levels: [1, 2, 3, 4],
    answerType: 'decimal',
    make: (rng, level) => makeDec(rng, level, mode),
    text: ({ d, places }) => `${d}${particle(d, '을/를')} ${MODES[mode]}하여 ${decPlaceName(places)}까지 나타내세요.`,
    answer: ({ d, places }) => roundDec(Dec.of(d), places, mode),
    verify: ({ d, places }, ans) => roundDecByDigits(Dec.of(d), places, mode).eq(ans),
    mistakes: [
      ...otherModes(mode).map((m) => ({
        id: `mode-${m}`,
        cause: 'concept',
        optional: true,
        value: ({ d, places }) => roundDec(Dec.of(d), places, m),
        explain: () => `${MODES[m]}을 했어요. ${MODES[mode]}은 ${MODE_RULE[mode]}`,
      })),
      {
        id: 'wrong-place',
        cause: 'condition',
        optional: true,
        value: ({ d, places }) => {
          const scale = Dec.of(d).scale;
          const other = places > 0 ? places - 1 : places + 1 < scale ? places + 1 : null;
          return other === null ? null : roundDec(Dec.of(d), other, mode);
        },
        explain: ({ places }) => `${decPlaceName(places)}까지 나타내야 하는데 다른 자리까지 나타냈어요. 어느 자리까지인지 다시 읽어요.`,
      },
      {
        id: 'no-round',
        cause: 'concept',
        value: ({ d }) => Dec.of(d),
        explain: () => '어림하지 않고 처음 수를 그대로 썼어요.',
      },
      ...(mode === 'half'
        ? [{
            id: 'last-digit',
            cause: 'concept',
            optional: true,
            value: ({ d, places }) => roundDecByLastDigit(Dec.of(d), places),
            explain: () => '맨 끝 숫자를 보고 정했어요. 반올림은 구하려는 자리 바로 아래 숫자 하나만 봐요.',
          }]
        : []),
    ],
    hints: [
      ({ d, places }) => `‘${MODES[mode]}하여 ${decPlaceName(places)}까지’를 다시 확인해 볼까요? ${d}에서 ${decPlaceName(places)} 숫자에 밑줄을 그어 봐요.`,
      ({ d, places }) => `${decPlaceName(places)} 아래 숫자는 ${ieyo(lower(d, places))}. ${MODE_RULE[mode]}`,
      ({ d, places }) => {
        const down = roundDec(Dec.of(d), places, 'down');
        return `따라 풀어 봐요.\n아래 수를 버리면: ${down}\n${decPlaceName(places)} 숫자를 1 크게 하면: ${down.add(new Dec(1, places))}\n${MODES[mode]}하면 둘 중 어느 쪽일까요? → □`;
      },
    ],
    concept: MODE_CONCEPT[mode] + ' 소수도 같은 방법이에요. 예를 들어 2.37을 반올림하여 소수 첫째 자리까지 나타내면 2.4예요.',
    solution: ({ d, places }) => {
      const l = lower(d, places);
      const reason =
        mode === 'down' ? '아래 수를 모두 버려요' : mode === 'up' ? '0이 아닌 숫자가 있으므로 올려요' : Number(l[0]) >= 5 ? `바로 아래 숫자 ${l[0]}${particle(l[0], '이/가')} 5 이상이므로 올려요` : `바로 아래 숫자 ${l[0]}${particle(l[0], '이/가')} 5보다 작으므로 버려요`;
      return [`${d}의 ${decPlaceName(places)} 아래 숫자: ${l}`, `${reason} → ${roundDec(Dec.of(d), places, mode)}`];
    },
  });
}

// ── 어림한 두 수의 크기 비교 ───────────────────────────

function compareTemplate(mode) {
  return defineTemplate({
    id: `u1-${SUB_OF[mode]}-compare`,
    unit: 1,
    sub: SUB_OF[mode],
    style: 'A',
    styleName: '크기 비교',
    levels: [1, 2, 3, 4],
    answerType: 'compare',
    make(rng, level) {
      const R = { 1: [3, [10, 10]], 2: [4, [100, 10]], 3: [4, [100, 100]], 4: [5, [1000, 100]] }[level];
      const want = rng.pick(['>', '=', '<']);
      let last = null;
      for (let i = 0; i < 200; i++) {
        const [ua, ub] = rng.shuffle(R[1]);
        const A = digitsRange(rng, R[0]);
        const Ra = roundInt(A, ua, mode);
        const B = Ra + rng.int(-ua, ua);
        if (B <= 0 || B === A || B % ub === 0 || A % ua === 0) continue;
        last = { A, B, ua, ub };
        const ans = cmp(Ra, roundInt(B, ub, mode));
        if (ans !== want) continue;
        if (ans === cmp(A, B) && i < 150 && rng.chance(0.6)) continue;
        return last;
      }
      return last;
    },
    text: ({ A, B, ua, ub }) =>
      `두 수의 크기를 비교하여 ○ 안에 >, =, < 중 알맞은 것을 고르세요.\n` +
      `(가) ${A}${particle(A, '을/를')} ${MODES[mode]}하여 ${placeName(ua)}까지 나타낸 수\n` +
      `(나) ${B}${particle(B, '을/를')} ${MODES[mode]}하여 ${placeName(ub)}까지 나타낸 수\n(가) ○ (나)`,
    answer: ({ A, B, ua, ub }) => cmp(roundInt(A, ua, mode), roundInt(B, ub, mode)),
    verify: ({ A, B, ua, ub }, ans) => cmp(roundIntByDigits(A, ua, mode), roundIntByDigits(B, ub, mode)) === ans,
    mistakes: [
      {
        id: 'raw',
        cause: 'concept',
        optional: true,
        value: ({ A, B }) => cmp(A, B),
        explain: () => '어림하기 전의 수를 비교했어요. 먼저 두 수를 각각 어림한 다음 비교해요.',
      },
    ],
    hints: [
      () => '먼저 두 수를 각각 어림해 볼까요? 어림하기 전의 수를 비교하면 안 돼요.',
      ({ A, ua }) => `(가)를 어림하면 ${ieyo(roundInt(A, ua, mode))}. (나)도 어림해 보세요.`,
      ({ A, B, ua, ub }) => `따라 풀어 봐요.\n(가) ${A} → ${roundInt(A, ua, mode)}\n(나) ${B} → ${roundInt(B, ub, mode)}\n${roundInt(A, ua, mode)} ○ ${roundInt(B, ub, mode)} → 어느 쪽이 클까요?`,
    ],
    concept: MODE_CONCEPT[mode],
    solution: ({ A, B, ua, ub }) => {
      const ra = roundInt(A, ua, mode);
      const rb = roundInt(B, ub, mode);
      return [`(가) ${A} → ${ra}`, `(나) ${B} → ${rb}`, `${ra} ${cmp(ra, rb)} ${rb}`];
    },
  });
}

// ── 생활 속 올림·버림 (나눗셈 상황, 지폐) ─────────────────

const LIFE = {
  up: [
    { kind: 'div', text: (N, M) => `학생 ${N}명이 모두 버스를 타려고 해요. 버스 한 대에 ${M}명까지 탈 수 있다면, 버스는 적어도 몇 대 필요한가요?`, thing: '버스', counter: '대', rest: '명' },
    { kind: 'div', text: (N, M) => `귤 ${N}개를 한 상자에 ${M}개씩 모두 담으려고 해요. 상자는 적어도 몇 개 필요한가요?`, thing: '상자', counter: '개', rest: '개' },
    { kind: 'money', text: (P, U) => `${P}원짜리 물건을 ${U}원짜리 지폐로만 사려고 해요. 적어도 얼마를 내야 하나요? (원)` },
  ],
  down: [
    { kind: 'div', text: (N, M) => `리본 ${N} cm로 꽃 한 송이를 만드는 데 ${M} cm가 필요해요. 꽃은 최대 몇 송이 만들 수 있나요?`, thing: '꽃', counter: '송이', rest: ' cm' },
    { kind: 'div', text: (N, M) => `사과 ${N}개를 한 봉지에 ${M}개씩 담아서 팔려고 해요. 팔 수 있는 봉지는 최대 몇 봉지인가요?`, thing: '봉지', counter: '봉지', rest: '개' },
    { kind: 'money', text: (P, U) => `동전 ${P}원을 ${U}원짜리 지폐로 바꾸려고 해요. 지폐로 바꿀 수 있는 돈은 최대 얼마인가요? (원)` },
  ],
};

function lifeTemplate(mode) {
  const ceil = mode === 'up';
  const divAnswer = (N, M) => (ceil ? Math.ceil(N / M) : Math.floor(N / M));
  return defineTemplate({
    id: `u1-${SUB_OF[mode]}-life`,
    unit: 1,
    sub: SUB_OF[mode],
    style: 'A',
    styleName: '생활 속 문제',
    levels: [1, 2, 3, 4],
    answerType: 'natural',
    weakness: ['condition'],
    make(rng, level) {
      const si = rng.int(0, LIFE[mode].length - 1);
      if (LIFE[mode][si].kind === 'money') {
        const U = level === 4 ? 10000 : 1000;
        for (;;) {
          const P = level === 4 ? rng.int(1000, 9999) * 10 : rng.int(level * 100 + 100, 999) * 10;
          if (P % U !== 0 && P > U) return { si, P, U };
        }
      }
      const R = { 1: [[20, 60], [5, 10]], 2: [[30, 150], [8, 15]], 3: [[100, 400], [12, 45]], 4: [[300, 1000], [25, 45]] }[level];
      for (;;) {
        const N = rng.int(...R[0]);
        const M = rng.int(...R[1]);
        if (N % M !== 0 && N > M) return { si, N, M };
      }
    },
    text: ({ si, N, M, P, U }) => (LIFE[mode][si].kind === 'money' ? LIFE[mode][si].text(P, U) : LIFE[mode][si].text(N, M)),
    answer: ({ si, N, M, P, U }) => (LIFE[mode][si].kind === 'money' ? roundInt(P, U, mode) : divAnswer(N, M)),
    verify: ({ si, N, M, P, U }, ans) => {
      if (LIFE[mode][si].kind === 'money') {
        return ans % U === 0 && (ceil ? ans >= P && ans - U < P : ans <= P && ans + U > P);
      }
      return ceil ? ans * M >= N && (ans - 1) * M < N : ans * M <= N && (ans + 1) * M > N;
    },
    mistakes: [
      {
        id: ceil ? 'floor' : 'ceil',
        cause: 'concept',
        value: ({ si, N, M, P, U }) => (LIFE[mode][si].kind === 'money' ? roundInt(P, U, ceil ? 'down' : 'up') : ceil ? Math.floor(N / M) : Math.ceil(N / M)),
        explain: ({ si, N, M }) => {
          const s = LIFE[mode][si];
          if (s.kind === 'money') return ceil ? '버림을 하면 돈이 모자라서 물건을 살 수 없어요. 모자라지 않게 올림을 해야 해요.' : '올림을 하면 가진 돈보다 많아져요. 가진 돈 안에서 바꿔야 하니까 버림을 해요.';
          return ceil
            ? `남은 ${N % M}${s.rest}도 생각해야 해요. 남는 것이 있으면 ${s.thing} 하나가 더 필요해요.`
            : `남은 ${N % M}${s.rest}로는 ${s.thing} 하나를 만들 수 없어요. 남는 것은 버려요.`;
        },
      },
      {
        id: 'half',
        cause: 'concept',
        optional: true,
        value: ({ si, P, U }) => (LIFE[mode][si].kind === 'money' ? roundInt(P, U, 'half') : null),
        explain: () => `반올림을 했어요. 이 상황은 ${MODES[mode]}을 해야 해요.`,
      },
    ],
    hints: [
      ({ si }) => {
        const s = LIFE[mode][si];
        if (s.kind === 'money') return ceil ? '문제에서 꼭 지켜야 할 조건을 다시 읽어 볼까요? 지폐로만 내야 하고, 돈이 모자라면 안 돼요.' : '문제에서 꼭 지켜야 할 조건을 다시 읽어 볼까요? 가진 동전보다 많이 바꿀 수는 없어요.';
        return ceil ? `문제에서 꼭 지켜야 할 조건을 다시 읽어 볼까요? ‘모두’라는 말이 있어요. 남는 것이 있으면 어떻게 해야 할까요?` : '문제에서 꼭 지켜야 할 조건을 다시 읽어 볼까요? 남는 것으로는 하나를 다 채울 수 없어요.';
      },
      ({ si, N, M, P, U }) => {
        const s = LIFE[mode][si];
        if (s.kind === 'money') return `${P}원을 ${U}원 단위로 ${MODES[mode]}해요. ${MODE_RULE[mode]}`;
        return `${N} ÷ ${M} = ${Math.floor(N / M)} … ${ieyo(N % M)}. 남은 ${N % M}${s.rest}${particle(s.rest, '은/는')} 어떻게 할까요?`;
      },
      ({ si, N, M, P, U }) => {
        const s = LIFE[mode][si];
        if (s.kind === 'money') return `따라 풀어 봐요.\n${P}원 → ${U}원 단위로 ${MODES[mode]} → □원`;
        const q = Math.floor(N / M);
        return ceil
          ? `따라 풀어 봐요.\n${M}씩 ${q}${s.counter} → ${q * M}\n남은 ${N % M}${s.rest}도 넣어야 하니까 ${q} + 1 = □${s.counter}`
          : `따라 풀어 봐요.\n${M}씩 ${q}${s.counter} → ${q * M}\n남은 ${N % M}${s.rest}로는 하나를 채울 수 없으니까 → □${s.counter}`;
      },
    ],
    concept:
      MODE_CONCEPT[mode] +
      (ceil
        ? ' 생활에서는 ‘모자라면 안 될 때’ 올림을 써요. 예: 버스 대수, 상자 개수, 지폐로만 물건값 내기.'
        : ' 생활에서는 ‘다 채우지 못한 것은 셀 수 없을 때’ 버림을 써요. 예: 만들 수 있는 개수, 지폐로 바꿀 수 있는 돈.'),
    solution: ({ si, N, M, P, U }) => {
      const s = LIFE[mode][si];
      if (s.kind === 'money') return [`${P}원을 ${U}원 단위로 ${MODES[mode]}`, `→ ${roundInt(P, U, mode)}원`];
      const q = Math.floor(N / M);
      return [`${N} ÷ ${M} = ${q} … ${N % M}`, ceil ? `남은 ${N % M}${s.rest}도 필요하므로 ${q} + 1 = ${q + 1}(${s.counter})` : `남은 ${N % M}${s.rest}${particle(s.rest, '은/는')} 버리므로 ${q}(${s.counter})`];
    },
  });
}

// 반올림 생활 문제: 큰 수를 반올림해서 어림잡기
const HALF_SCENES = [
  { t: (n) => `어느 공연장에 온 관람객은 ${n}명이에요.`, what: '관람객 수', unitWord: '명' },
  { t: (n) => `어느 마을의 인구는 ${n}명이에요.`, what: '인구', unitWord: '명' },
  { t: (n) => `집에서 할머니 댁까지의 거리는 ${n} m예요.`, what: '거리', unitWord: 'm' },
  { t: (n) => `어느 과자 공장에서 하루에 만든 과자는 ${n}개예요.`, what: '과자 수', unitWord: '개' },
];

const halfLifeTemplate = defineTemplate({
  id: 'u1-6-life',
  unit: 1,
  sub: 6,
  style: 'A',
  styleName: '생활 속 문제',
  levels: [1, 2, 3, 4],
  answerType: 'natural',
  make(rng, level) {
    return { ...makeNat(rng, level, 'half'), si: rng.int(0, HALF_SCENES.length - 1) };
  },
  text: ({ n, unit, si }) => {
    const s = HALF_SCENES[si];
    return `${s.t(n)} ${josa(s.what, '을/를')} 반올림하여 ${placeName(unit)}까지 나타내면 약 몇 ${s.unitWord}인가요?`;
  },
  answer: ({ n, unit }) => roundInt(n, unit, 'half'),
  verify: ({ n, unit }, ans) => roundIntByDigits(n, unit, 'half') === ans,
  mistakes: natMistakes('half'),
  hints: natHints('half'),
  concept: MODE_CONCEPT.half,
  solution: (p) => natSolution(p, 'half'),
});

// 반올림하여 T가 되는 수가 아닌 것 찾기
const cannotTemplate = defineTemplate({
  id: 'u1-6-cannot',
  unit: 1,
  sub: 6,
  style: 'A',
  styleName: '수 찾기',
  levels: [1, 2, 3, 4],
  answerType: 'choice',
  make(rng, level) {
    const unit = { 1: 10, 2: 10, 3: 100, 4: 1000 }[level];
    const T = rng.int(3, 98) * unit;
    const lo = T - unit / 2;
    const hi = T + unit / 2 - 1;
    const valid = new Set();
    if (level >= 2) valid.add(rng.pick([lo, hi]));
    while (valid.size < 3) valid.add(rng.int(lo, hi));
    const bad = level >= 2 ? rng.pick([hi + 1, lo - 1]) : rng.pick([hi + rng.int(1, unit / 2), lo - rng.int(1, unit / 2)]);
    return { T, unit, valid: [...valid], bad };
  },
  text: ({ T, unit }) => `반올림하여 ${placeName(unit)}까지 나타내면 ${josa(T, '이/가')} 되는 수가 아닌 것을 고르세요.`,
  answer: ({ bad }) => String(bad),
  options: ({ valid, bad }) => [...valid, bad].map(String),
  verify: ({ T, unit, valid, bad }) => roundIntByDigits(bad, unit, 'half') !== T && valid.every((v) => roundIntByDigits(v, unit, 'half') === T),
  mistakes: [0, 1, 2].map((i) => ({
    id: `valid-${i}`,
    cause: 'concept',
    value: ({ valid }) => String(valid[i]),
    explain: ({ T, unit, valid }) => `${valid[i]}${particle(valid[i], '은/는')} 반올림하면 ${josa(T, '이/가')} 돼요. (${placeName(unit)} 바로 아래 숫자: ${lowerDigits(valid[i], unit)[0]})`,
  })),
  hints: [
    ({ unit }) => `보기의 수를 하나씩 반올림하여 ${placeName(unit)}까지 나타내 볼까요?`,
    ({ T, unit }) => `반올림하여 ${josa(T, '이/가')} 되는 수는 ${T - unit / 2}부터 ${T + unit / 2 - 1}까지예요.`,
    ({ T, unit, valid }) => `따라 풀어 봐요.\n${valid[0]} → ${roundInt(valid[0], unit, 'half')}\n나머지 보기도 반올림해서 ${josa(T, '이/가')} 안 되는 것을 찾아요.`,
  ],
  concept: MODE_CONCEPT.half,
  solution: ({ unit, valid, bad }) => [...[...valid, bad].map((v) => `${v} → ${roundInt(v, unit, 'half')}`)],
});

// ── 소단원 7: 활용 ──────────────────────────────────

const rangeOf = (T, unit, mode) =>
  mode === 'half' ? { min: T - unit / 2, max: T + unit / 2 - 1 } : mode === 'up' ? { min: T - unit + 1, max: T } : { min: T, max: T + unit - 1 };

const originalRangeTemplate = defineTemplate({
  id: 'u1-7-range',
  unit: 1,
  sub: 7,
  style: 'A',
  styleName: '범위 구하기',
  levels: [1, 2, 3, 4],
  answerType: 'minmax',
  make(rng, level) {
    const unit = level <= 2 ? 10 : 100;
    const mode = rng.pick(MODE_KEYS);
    return { mode, unit, T: rng.int(level <= 2 ? 3 : 10, 99) * unit };
  },
  text: ({ mode, unit, T }) =>
    `어떤 자연수를 ${MODES[mode]}하여 ${placeName(unit)}까지 나타내면 ${ieyo(T)}. 어떤 자연수가 될 수 있는 수 중에서 가장 작은 수와 가장 큰 수를 구하세요.`,
  answer: ({ mode, unit, T }) => rangeOf(T, unit, mode),
  verify: ({ mode, unit, T }, ans) => {
    const hits = [];
    for (let k = T - 2 * unit; k <= T + 2 * unit; k++) if (k > 0 && roundIntByDigits(k, unit, mode) === T) hits.push(k);
    return hits[0] === ans.min && hits[hits.length - 1] === ans.max;
  },
  mistakes: [
    {
      id: 'max-edge',
      cause: 'concept',
      value: ({ mode, unit, T }) => ({ ...rangeOf(T, unit, mode), max: rangeOf(T, unit, mode).max + 1 }),
      explain: ({ mode, unit, T }) => {
        const m = rangeOf(T, unit, mode).max + 1;
        return `가장 큰 수를 1 크게 썼어요. ${m}${particle(m, '을/를')} ${MODES[mode]}하면 ${josa(roundInt(m, unit, mode), '이/가')} 돼요.`;
      },
    },
    {
      id: 'min-edge',
      cause: 'concept',
      value: ({ mode, unit, T }) => ({ ...rangeOf(T, unit, mode), min: rangeOf(T, unit, mode).min - 1 }),
      explain: ({ mode, unit, T }) => {
        const m = rangeOf(T, unit, mode).min - 1;
        return `가장 작은 수를 1 작게 썼어요. ${m}${particle(m, '을/를')} ${MODES[mode]}하면 ${josa(roundInt(m, unit, mode), '이/가')} 돼요.`;
      },
    },
    {
      id: 'other-mode',
      cause: 'concept',
      optional: true,
      value: ({ mode, unit, T }) => rangeOf(T, unit, mode === 'half' ? 'down' : 'half'),
      explain: ({ mode }) => `${MODES[mode]}이 아닌 다른 방법으로 생각했어요. ${MODES[mode]}은 ${MODE_RULE[mode]}`,
    },
  ],
  hints: [
    ({ mode, unit, T }) => `‘${MODES[mode]}하여 ${placeName(unit)}까지 나타내면 ${T}’${particle(T, '이라는/라는')} 조건을 다시 읽어 볼까요? 어떤 수들이 ${josa(T, '이/가')} 될 수 있을까요?`,
    ({ mode, unit, T }) => `${T} 근처의 수를 몇 개 ${MODES[mode]}해 보세요. 예를 들어 ${T - 1} → ${roundInt(T - 1, unit, mode)}, ${T + 1} → ${roundInt(T + 1, unit, mode)}`,
    ({ mode, unit, T }) => {
      const r = rangeOf(T, unit, mode);
      return `따라 풀어 봐요.\n${r.min - 1} → ${roundInt(r.min - 1, unit, mode)}, ${r.min} → ${roundInt(r.min, unit, mode)}\n${r.max} → ${roundInt(r.max, unit, mode)}, ${r.max + 1} → ${roundInt(r.max + 1, unit, mode)}\n${josa(T, '이/가')} 되는 가장 작은 수와 가장 큰 수는?`;
    },
  ],
  concept: (p) => MODE_CONCEPT[p.mode] + ' 어림한 결과를 보고 처음 수를 찾을 때는 범위의 끝 수를 직접 어림해서 확인해 보면 실수가 줄어요.',
  solution: ({ mode, unit, T }) => {
    const r = rangeOf(T, unit, mode);
    return [`${MODES[mode]}하여 ${josa(T, '이/가')} 되는 수: ${r.min}부터 ${r.max}까지`, `가장 작은 수 ${r.min}, 가장 큰 수 ${r.max}`];
  },
});

function permutations(arr) {
  if (arr.length <= 1) return [arr];
  return arr.flatMap((x, i) => permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((rest) => [x, ...rest]));
}

const extremeNumber = (cards, big) => {
  const sorted = [...cards].sort((a, b) => (big ? b - a : a - b));
  if (!big && sorted[0] === 0) {
    const i = sorted.findIndex((d) => d !== 0);
    [sorted[0], sorted[i]] = [sorted[i], sorted[0]];
  }
  return Number(sorted.join(''));
};

const cardsTemplate = defineTemplate({
  id: 'u1-7-cards',
  unit: 1,
  sub: 7,
  style: 'A',
  styleName: '수 카드',
  levels: [1, 2, 3, 4],
  answerType: 'natural',
  weakness: ['condition'],
  make(rng, level) {
    const k = { 1: 3, 2: 4, 3: 4, 4: 5 }[level];
    const pool = level >= 3 ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (;;) {
      const cards = rng.shuffle(pool).slice(0, k);
      if (level >= 3 && !cards.includes(0) && rng.chance(0.6)) continue;
      const unit = rng.pick(k === 3 ? [10] : k === 4 ? [10, 100] : [100, 1000]);
      const big = rng.chance(0.5);
      const mode = rng.pick(MODE_KEYS);
      if (extremeNumber(cards, big) % unit === 0) continue;
      return { cards, unit, big, mode };
    }
  },
  text: ({ cards, unit, big, mode }) =>
    `수 카드 ${cards.length}장을 한 번씩 모두 사용하여 가장 ${big ? '큰' : '작은'} ${cards.length}자리 수를 만들었어요. 이 수를 ${MODES[mode]}하여 ${placeName(unit)}까지 나타내세요.`,
  figure: ({ cards }) => ({ type: 'cards', cards }),
  answer: ({ cards, unit, big, mode }) => roundInt(extremeNumber(cards, big), unit, mode),
  verify: ({ cards, unit, big, mode }, ans) => {
    const nums = permutations(cards).filter((p) => p[0] !== 0).map((p) => Number(p.join('')));
    const target = big ? Math.max(...nums) : Math.min(...nums);
    return roundIntByDigits(target, unit, mode) === ans;
  },
  mistakes: [
    {
      id: 'opposite',
      cause: 'condition',
      value: ({ cards, unit, big, mode }) => roundInt(extremeNumber(cards, !big), unit, mode),
      explain: ({ big }) => `가장 ${big ? '작은' : '큰'} 수를 만들었어요. 문제는 가장 ${big ? '큰' : '작은'} 수를 만들라고 했어요.`,
    },
    {
      id: 'no-round',
      cause: 'condition',
      value: ({ cards, big }) => extremeNumber(cards, big),
      explain: ({ mode }) => `수를 만들고 ${MODES[mode]}하는 것을 빼먹었어요. 문제의 마지막 조건까지 확인해요.`,
    },
    {
      id: 'zero-first',
      cause: 'concept',
      value: ({ cards, unit, big, mode }) => (!big && cards.includes(0) ? roundInt(Number([...cards].sort((a, b) => a - b).join('')), unit, mode) : null),
      explain: () => '가장 높은 자리에 0을 놓았어요. 0은 맨 앞에 올 수 없어서 두 번째로 작은 숫자를 맨 앞에 놓아요.',
    },
    ...MODE_KEYS.map((m) => ({
      id: `mode-${m}`,
      cause: 'concept',
      optional: true,
      value: ({ cards, unit, big, mode }) => (m === mode ? null : roundInt(extremeNumber(cards, big), unit, m)),
      explain: ({ mode }) => `${MODES[m]}을 했어요. ${MODES[mode]}은 ${MODE_RULE[mode]}`,
    })),
  ],
  hints: [
    ({ big, mode, unit }) => `문제에서 꼭 지켜야 할 조건을 다시 읽어 볼까요? ① 가장 ${big ? '큰' : '작은'} 수 만들기 ② ${MODES[mode]}하여 ${placeName(unit)}까지`,
    ({ big, cards }) => (big ? '가장 큰 수는 큰 숫자부터 높은 자리에 놓아요.' : `가장 작은 수는 작은 숫자부터 높은 자리에 놓아요.${cards.includes(0) ? ' 단, 0은 맨 앞에 올 수 없어요.' : ''}`),
    ({ cards, big, mode, unit }) => `따라 풀어 봐요.\n만든 수: ${extremeNumber(cards, big)}\n이 수를 ${MODES[mode]}하여 ${placeName(unit)}까지 → □`,
  ],
  concept: (p) => MODE_CONCEPT[p.mode],
  solution: ({ cards, unit, big, mode }) => {
    const n = extremeNumber(cards, big);
    return [`가장 ${big ? '큰' : '작은'} 수: ${n}`, `${MODES[mode]}하여 ${placeName(unit)}까지: ${roundInt(n, unit, mode)}`];
  },
});

const METHOD_SCENES = [
  { mode: 'up', t: (r) => `학생 ${r.int(101, 299)}명이 한 대에 ${r.int(30, 45)}명까지 탈 수 있는 버스에 모두 타려면 버스가 몇 대 필요한지 구할 때`, why: '남는 학생도 모두 타야 하니까 한 대를 더 세야 해요.' },
  { mode: 'up', t: (r) => `${r.int(11, 99) * 100 + r.int(1, 9) * 10}원짜리 물건을 1000원짜리 지폐로만 살 때 내야 하는 돈을 구할 때`, why: '돈이 모자라면 살 수 없으니까 올려서 내야 해요.' },
  { mode: 'up', t: (r) => `선물 ${r.int(41, 199)}개를 한 상자에 ${r.int(6, 12)}개씩 모두 포장하려면 필요한 상자 수를 구할 때`, why: '남는 선물도 포장해야 하니까 상자가 하나 더 필요해요.' },
  { mode: 'down', t: (r) => `동전 ${r.int(11, 99) * 100 + r.int(1, 9) * 10}원을 1000원짜리 지폐로 바꿀 때 바꿀 수 있는 최대 금액을 구할 때`, why: '1000원이 안 되는 나머지 동전은 지폐로 바꿀 수 없어요.' },
  { mode: 'down', t: (r) => `리본 ${r.int(101, 499)} cm로 ${r.int(15, 40)} cm짜리 매듭을 최대 몇 개 만들 수 있는지 구할 때`, why: '남은 리본으로는 매듭 하나를 다 만들 수 없어요.' },
  { mode: 'down', t: (r) => `귤 ${r.int(51, 199)}개를 ${r.int(6, 12)}개씩 봉지에 담아 팔 때 팔 수 있는 봉지 수를 구할 때`, why: '다 채우지 못한 봉지는 팔 수 없어요.' },
  { mode: 'half', t: (r) => `키 ${r.int(1301, 1599) / 10} cm를 가장 가까운 1 cm 단위로 나타낼 때`, why: '가장 가까운 쪽으로 나타낼 때는 반올림을 써요.' },
  { mode: 'half', t: (r) => `관람객 ${r.int(10001, 99999)}명을 가장 가까운 천 명 단위로 어림할 때`, why: '가장 가까운 쪽으로 나타낼 때는 반올림을 써요.' },
];

const methodTemplate = defineTemplate({
  id: 'u1-7-method',
  unit: 1,
  sub: 7,
  style: 'A',
  styleName: '어림 방법 고르기',
  levels: [1, 2, 3, 4],
  answerType: 'choice',
  make(rng) {
    const si = rng.int(0, METHOD_SCENES.length - 1);
    return { si, situation: METHOD_SCENES[si].t(rng) };
  },
  text: ({ situation }) => `다음 상황에서 어림하는 방법으로 가장 알맞은 것을 고르세요.\n${situation}`,
  answer: ({ si }) => MODES[METHOD_SCENES[si].mode],
  options: () => ['올림', '버림', '반올림'],
  verify: ({ si }, ans) => ({ up: '올림', down: '버림', half: '반올림' })[METHOD_SCENES[si].mode] === ans,
  mistakes: MODE_KEYS.map((m) => ({
    id: `pick-${m}`,
    cause: 'concept',
    optional: true,
    value: () => MODES[m],
    explain: ({ si }) => `${MODES[m]}이 아니에요. ${METHOD_SCENES[si].why}`,
  })),
  hints: [
    () => '상황을 다시 읽어 볼까요? 모자라면 안 되는 상황인지, 다 채우지 못한 것은 버리는 상황인지, 가장 가까운 수로 나타내는 상황인지 생각해 봐요.',
    () => '모자라면 안 될 때는 올림, 다 채우지 못한 것을 버릴 때는 버림, 가장 가까운 쪽으로 나타낼 때는 반올림이에요.',
    ({ si }) => `따라 풀어 봐요.\n${METHOD_SCENES[si].why}\n그렇다면 어떤 방법일까요?`,
  ],
  concept:
    '생활에서 어림할 때는 상황에 맞는 방법을 골라요. 모자라면 안 될 때(버스 대수, 지폐로 물건값 내기)는 올림, ' +
    '다 채우지 못한 것은 셀 수 없을 때(만들 수 있는 개수, 지폐로 바꾸기)는 버림, 가장 가까운 수로 나타낼 때(키, 관람객 수)는 반올림을 써요.',
  solution: ({ si }) => [METHOD_SCENES[si].why, `→ ${MODES[METHOD_SCENES[si].mode]}`],
});

const notebookTemplate = defineTemplate({
  id: 'u1-7-notebook',
  unit: 1,
  sub: 7,
  style: 'A',
  styleName: '문장제',
  levels: [1, 2, 3, 4],
  answerType: 'natural',
  weakness: ['condition'],
  make(rng, level) {
    const U = level === 4 ? 10000 : 1000;
    for (;;) {
      const P = level === 4 ? rng.int(20, 90) * 100 : rng.int(30, 250) * 10;
      const n = rng.int(2, level === 1 ? 4 : 8);
      const what = rng.pick(['공책', '연필', '지우개', '색종이 묶음', '스티커']);
      if ((P * n) % U !== 0) return { P, n, U, what, name: rng.pick(NAMES) };
    }
  },
  text: ({ P, n, U, what, name }) =>
    `${josa(name, '은/는')} 한 개에 ${P}원인 ${josa(what, '을/를')} ${n}개 사려고 해요. ${U}원짜리 지폐로만 낸다면 지폐를 적어도 몇 장 내야 하나요?`,
  answer: ({ P, n, U }) => Math.ceil((P * n) / U),
  verify: ({ P, n, U }, ans) => ans * U >= P * n && (ans - 1) * U < P * n,
  mistakes: [
    {
      id: 'skip-count',
      cause: 'condition',
      optional: true,
      value: ({ P, U }) => Math.ceil(P / U),
      explain: ({ n, what }) => `${what} ${n}개 값이 아니라 1개 값만 생각했어요. 먼저 전체 값을 구해요.`,
    },
    {
      id: 'floor',
      cause: 'concept',
      value: ({ P, n, U }) => Math.floor((P * n) / U),
      explain: () => '버림을 하면 돈이 모자라요. 지폐로만 낼 때는 올림을 해야 해요.',
    },
    {
      id: 'money-not-count',
      cause: 'condition',
      value: ({ P, n, U }) => roundInt(P * n, U, 'up'),
      explain: ({ U }) => `낼 돈은 맞게 구했지만, 물어본 것은 ${U}원짜리 지폐의 ‘장수’예요.`,
    },
  ],
  hints: [
    ({ n, U }) => `문제에서 꼭 지켜야 할 조건을 다시 읽어 볼까요? ${n}개를 사고, ${U}원짜리 지폐로만 내고, 지폐가 몇 장인지 물어요.`,
    ({ P, n }) => `먼저 전체 값을 구해 보세요. ${P} × ${n} = □`,
    ({ P, n, U }) => `따라 풀어 봐요.\n전체 값: ${P} × ${n} = ${P * n}원\n${U}원짜리로 모자라지 않게 내려면 올림 → ${roundInt(P * n, U, 'up')}원\n지폐는 □장`,
  ],
  concept: MODE_CONCEPT.up + ' 지폐로만 물건값을 낼 때는 돈이 모자라면 안 되니까 올림을 써요.',
  solution: ({ P, n, U }) => [`전체 값: ${P} × ${n} = ${P * n}(원)`, `올림하여 ${placeName(U)}까지: ${roundInt(P * n, U, 'up')}원`, `지폐: ${roundInt(P * n, U, 'up') / U}장`],
});

export default [
  natTemplate('up'), decTemplate('up'), lifeTemplate('up'), compareTemplate('up'),
  natTemplate('down'), decTemplate('down'), lifeTemplate('down'), compareTemplate('down'),
  natTemplate('half'), decTemplate('half'), halfLifeTemplate, compareTemplate('half'), cannotTemplate,
  originalRangeTemplate, cardsTemplate, methodTemplate, notebookTemplate,
];
