// 1단원 수의 범위와 어림하기 — 소단원 1~3 (이상·이하, 초과·미만, 수의 범위 활용)
import { NAMES, josa, particle, ieyo } from '../core/words.js';
import { defineTemplate } from '../engine/template.js';

// 범위 말과 뜻
export const WORD = { ge: '이상', le: '이하', gt: '초과', lt: '미만' };
const FLIP = { ge: 'gt', gt: 'ge', le: 'lt', lt: 'le' }; // 경계 포함 여부를 바꾼 말
const INCLUDES = { ge: true, le: true, gt: false, lt: false };

// x가 "v 이상/이하/초과/미만"을 만족하는지
export function fits(x, v, type) {
  switch (type) {
    case 'ge': return x >= v;
    case 'le': return x <= v;
    case 'gt': return x > v;
    case 'lt': return x < v;
    default: throw new Error(type);
  }
}

// 같은 판단을 뺄셈의 부호로 다시 하기 (정답 확인용)
function fitsBySign(x, v, type) {
  const s = Math.sign(x - v);
  return { ge: [0, 1], le: [-1, 0], gt: [1], lt: [-1] }[type].includes(s);
}

const RULE = {
  ge: (n) => `‘${n} 이상’은 ${josa(n, '과/와')} 같거나 큰 수예요. ${n}도 들어가요.`,
  le: (n) => `‘${n} 이하’는 ${josa(n, '과/와')} 같거나 작은 수예요. ${n}도 들어가요.`,
  gt: (n) => `‘${n} 초과’는 ${n}보다 큰 수예요. ${josa(n, '은/는')} 들어가지 않아요.`,
  lt: (n) => `‘${n} 미만’은 ${n}보다 작은 수예요. ${josa(n, '은/는')} 들어가지 않아요.`,
};

const CONCEPT_1 =
  '‘이상’은 어떤 수와 같거나 큰 수, ‘이하’는 어떤 수와 같거나 작은 수예요. 기준이 되는 수도 들어가요. ' +
  '예를 들어 5 이상인 자연수는 5, 6, 7, …이고, 5 이하인 자연수는 1, 2, 3, 4, 5예요. 수직선에서는 ●로 나타내요.';
const CONCEPT_2 =
  '‘초과’는 어떤 수보다 큰 수, ‘미만’은 어떤 수보다 작은 수예요. 기준이 되는 수는 들어가지 않아요. ' +
  '예를 들어 5 초과인 자연수는 6, 7, 8, …이고, 5 미만인 자연수는 1, 2, 3, 4예요. 수직선에서는 ○로 나타내요. ' +
  '‘이상·이하’는 기준이 되는 수를 넣고, ‘초과·미만’은 넣지 않는다는 점이 달라요.';

const CONCEPT_3 =
  '수의 범위를 쓰는 문제는 먼저 범위의 양 끝 수가 들어가는지 확인해요. 이상·이하는 끝 수가 들어가고, 초과·미만은 들어가지 않아요. ' +
  '예를 들어 요금표에 ‘5 초과 25 이하’라고 쓰여 있으면 5는 들어가지 않고 25는 들어가요. 그래서 무게가 25 g이면 이 칸의 요금을 내요.';

const conceptFor = (sub) => (sub === 1 ? CONCEPT_1 : CONCEPT_2);

// ── 1. 수 고르기 (여러 개) ──────────────────────────────

function pickTemplate(sub) {
  const types = sub === 1 ? ['ge', 'le'] : ['gt', 'lt'];
  return defineTemplate({
    id: `u1-${sub}-pick`,
    unit: 1,
    sub,
    style: 'A',
    styleName: '수 고르기',
    levels: [1, 2, 3, 4],
    answerType: 'multi',
    make(rng, level) {
      const R = {
        1: { base: [10, 40], spread: 8, count: 6 },
        2: { base: [20, 90], spread: 12, count: 7 },
        3: { base: [100, 900], spread: 25, count: 8 },
        4: { base: [100, 900], spread: 6, count: 8 },
      }[level];
      for (;;) {
        const N = rng.int(...R.base);
        const set = new Set([N]);
        if (level === 4) [N - 1, N + 1].forEach((x) => set.add(x));
        while (set.size < R.count) set.add(N + rng.int(-R.spread, R.spread));
        const list = rng.shuffle([...set]);
        const type = rng.pick(types);
        const ins = list.filter((x) => fits(x, N, type)).length;
        if (ins === 0 || ins === list.length) continue;
        return { N, type, list };
      }
    },
    text: ({ N, type, list }) => `다음 수 중에서 ${N} ${WORD[type]}인 수를 모두 찾아 쓰세요.\n${list.join(',  ')}`,
    answer: ({ N, type, list }) => list.filter((x) => fits(x, N, type)).sort((a, b) => a - b),
    verify: ({ N, type, list }, ans) => list.every((x) => ans.includes(x) === fitsBySign(x, N, type)),
    mistakes: [
      {
        id: 'boundary',
        cause: 'concept',
        value: ({ N, type, list }) => list.filter((x) => fits(x, N, FLIP[type])).sort((a, b) => a - b),
        explain: ({ N, type }) => `${N}${particle(N, '을/를')} 잘못 넣거나 뺐어요. ${RULE[type](N)}`,
      },
      {
        id: 'opposite',
        cause: 'concept',
        value: ({ N, type, list }) => list.filter((x) => !fits(x, N, type)).sort((a, b) => a - b),
        explain: ({ N, type }) => `반대쪽 수를 골랐어요. ${RULE[type](N)}`,
      },
    ],
    hints: [
      ({ N, type }) => `‘${N} ${WORD[type]}’의 뜻을 다시 읽어 볼까요? ${josa(N, '이/가')} 들어가는지부터 생각해 봐요.`,
      ({ N, type }) => RULE[type](N),
      ({ N, type, list }) => {
        const show = list.slice(0, 2).map((x) => `${x} → ${fits(x, N, type) ? '들어가요' : '안 들어가요'}`);
        return `따라 풀어 봐요. 수를 하나씩 ${josa(N, '과/와')} 비교해요.\n${show.join('\n')}\n나머지 수도 같은 방법으로 확인해 보세요.`;
      },
    ],
    concept: conceptFor(sub),
    solution: ({ N, type, list }) => [
      ...list.map((x) => `${x} → ${fits(x, N, type) ? '○' : '×'}`),
      `${N} ${WORD[type]}인 수: ${list.filter((x) => fits(x, N, type)).sort((a, b) => a - b).join(', ')}`,
    ],
  });
}

// ── 2. 범위 안의 자연수 개수 ─────────────────────────────

function countTemplate(sub) {
  return defineTemplate({
    id: `u1-${sub}-count`,
    unit: 1,
    sub,
    style: 'A',
    styleName: '개수 세기',
    levels: [1, 2, 3, 4],
    answerType: 'natural',
    make(rng, level) {
      const R = {
        1: { N: [1, 20], gap: [3, 9] },
        2: { N: [10, 60], gap: [5, 20] },
        3: { N: [50, 300], gap: [10, 60] },
        4: { N: [100, 900], gap: [20, 150] },
      }[level];
      const N = rng.int(...R.N);
      const M = N + rng.int(...R.gap);
      let lo = 'ge';
      let hi = 'le';
      if (sub === 2) {
        do {
          lo = rng.pick(['ge', 'gt']);
          hi = rng.pick(['le', 'lt']);
        } while (lo === 'ge' && hi === 'le');
      }
      return { N, M, lo, hi };
    },
    text: ({ N, M, lo, hi }) => `${N} ${WORD[lo]} ${M} ${WORD[hi]}인 자연수는 모두 몇 개인가요?`,
    answer: ({ N, M, lo, hi }) => M - N + 1 - (INCLUDES[lo] ? 0 : 1) - (INCLUDES[hi] ? 0 : 1),
    verify: ({ N, M, lo, hi }, ans) => {
      let c = 0;
      for (let x = N - 3; x <= M + 3; x++) if (fitsBySign(x, N, lo) && fitsBySign(x, M, hi)) c++;
      return c === ans;
    },
    mistakes: [
      {
        id: 'both-in',
        cause: 'concept',
        optional: true,
        value: ({ N, M }) => M - N + 1,
        explain: ({ N, M, lo, hi }) => `${josa(N, '과/와')} ${M}${particle(M, '을/를')} 모두 넣어서 세었어요. ${RULE[lo](N)} ${RULE[hi](M)}`,
      },
      {
        id: 'diff-only',
        cause: 'concept',
        optional: true,
        value: ({ N, M }) => M - N,
        explain: ({ N, M, lo, hi }) => `두 수의 차 ${M} − ${N}만 구했어요. 양 끝 수가 들어가는지 하나씩 확인해요. ${RULE[lo](N)} ${RULE[hi](M)}`,
      },
      {
        id: 'both-out',
        cause: 'concept',
        optional: true,
        value: ({ N, M }) => M - N - 1,
        explain: ({ N, M, lo, hi }) => `${josa(N, '과/와')} ${M}${particle(M, '을/를')} 모두 빼고 세었어요. ${RULE[lo](N)} ${RULE[hi](M)}`,
      },
    ],
    hints: [
      ({ N, M, lo, hi }) =>
        `‘${N} ${WORD[lo]}’${particle(WORD[lo], '과/와')} ‘${M} ${WORD[hi]}’에서 ${josa(N, '과/와')} ${josa(M, '이/가')} 들어가는지 먼저 확인해 볼까요?`,
      ({ N, M }) => `${N}부터 ${M}까지의 자연수는 ${M} − ${N} + 1 = ${ieyo(`${M - N + 1}개`)}. 여기서 들어가지 않는 수를 빼요.`,
      ({ N, M, lo, hi }) =>
        `따라 풀어 봐요.\n${N}부터 ${M}까지: ${M - N + 1}개\n${N} ${WORD[lo]} → ${N}${INCLUDES[lo] ? ' 들어감' : ' 안 들어감 (1개 빼기)'}\n` +
        `${M} ${WORD[hi]} → ${M}${INCLUDES[hi] ? ' 들어감' : ' 안 들어감 (1개 빼기)'}\n답: □개`,
    ],
    concept: conceptFor(sub),
    solution: ({ N, M, lo, hi }) => {
      const first = INCLUDES[lo] ? N : N + 1;
      const last = INCLUDES[hi] ? M : M - 1;
      return [`들어가는 자연수: ${first}, ${first + 1}, …, ${last}`, `개수: ${last} − ${first} + 1 = ${last - first + 1}(개)`];
    },
  });
}

// ── 3. 수직선 읽기 (객관식) ──────────────────────────────

function lineTemplate(sub) {
  // 모양: [왼쪽 끝 종류, 오른쪽 끝 종류]. null이면 그쪽으로 화살표가 계속 이어진다.
  const SHAPES =
    sub === 1
      ? [['ge', 'le'], ['ge', null], [null, 'le']]
      : [['gt', 'lt'], ['ge', 'lt'], ['gt', 'le'], ['gt', null], [null, 'lt']];
  const describe = (N, M, lo, hi) => [lo && `${N} ${WORD[lo]}`, hi && `${M} ${WORD[hi]}`].filter(Boolean).join(' ');
  // 한 쪽만 있는 범위에서 방향을 반대로 읽은 말
  const REVERSE = { ge: 'le', gt: 'lt', le: 'ge', lt: 'gt' };
  return defineTemplate({
    id: `u1-${sub}-line`,
    unit: 1,
    sub,
    style: 'A',
    styleName: '수직선',
    levels: [1, 2, 3, 4],
    answerType: 'choice',
    make(rng, level) {
      const base = { 1: [5, 30], 2: [20, 80], 3: [100, 500], 4: [500, 990] }[level];
      const [lo, hi] = rng.pick(SHAPES);
      const N = rng.int(...base);
      const M = N + rng.int(2, 5);
      return { N, M, lo, hi };
    },
    text: () => '수직선에 나타낸 수의 범위를 바르게 쓴 것을 고르세요.',
    figure: ({ N, M, lo, hi }) => {
      const two = lo && hi;
      const v = lo ? N : M;
      return {
        type: 'numberline',
        min: two ? N - 2 : lo ? N - 2 : M - 7,
        max: two ? M + 2 : lo ? N + 7 : M + 2,
        from: lo ? { v: N, closed: INCLUDES[lo] } : null,
        to: hi ? { v: two ? M : v, closed: INCLUDES[hi] } : null,
      };
    },
    answer: ({ N, M, lo, hi }) => describe(N, M, lo, hi),
    options: ({ N, M, lo, hi }) =>
      lo && hi
        ? [['ge', 'le'], ['ge', 'lt'], ['gt', 'le'], ['gt', 'lt']].map(([a, b]) => describe(N, M, a, b))
        : ['ge', 'gt', 'le', 'lt'].map((t) => (lo ? `${N} ${WORD[t]}` : `${M} ${WORD[t]}`)),
    verify: ({ N, M, lo, hi }, ans) => {
      // 그림에서 읽은 포함 여부와 답 글자의 뜻이 정수마다 같은지 확인
      const words = ans.split(' ');
      for (let x = N - 8; x <= M + 8; x++) {
        const inFigure = (lo ? x > N || (x === N && INCLUDES[lo]) : true) && (hi ? x < M || (x === M && INCLUDES[hi]) : true);
        let inWords = true;
        for (let i = 0; i < words.length; i += 2) {
          const type = Object.keys(WORD).find((k) => WORD[k] === words[i + 1]);
          inWords = inWords && fitsBySign(x, Number(words[i]), type);
        }
        if (inFigure !== inWords) return false;
      }
      return true;
    },
    mistakes: [
      {
        id: 'circle-left',
        cause: 'concept',
        value: ({ N, M, lo, hi }) => (lo && hi ? describe(N, M, FLIP[lo], hi) : null),
        explain: ({ N }) => `${N}에 있는 점을 잘못 읽었어요. ●는 그 수가 들어가고(이상·이하), ○는 들어가지 않아요(초과·미만).`,
      },
      {
        id: 'circle-right',
        cause: 'concept',
        value: ({ N, M, lo, hi }) => (lo && hi ? describe(N, M, lo, FLIP[hi]) : null),
        explain: ({ M }) => `${M}에 있는 점을 잘못 읽었어요. ●는 그 수가 들어가고(이상·이하), ○는 들어가지 않아요(초과·미만).`,
      },
      {
        id: 'circle-both',
        cause: 'concept',
        value: ({ N, M, lo, hi }) => describe(N, M, lo && FLIP[lo], hi && FLIP[hi]),
        explain: () => '●와 ○를 반대로 읽었어요. ●는 그 수가 들어가고(이상·이하), ○는 들어가지 않아요(초과·미만).',
      },
      {
        id: 'direction',
        cause: 'concept',
        value: ({ N, M, lo, hi }) => (lo && hi ? null : lo ? `${N} ${WORD[REVERSE[lo]]}` : `${M} ${WORD[REVERSE[hi]]}`),
        explain: () => '화살표 방향을 반대로 읽었어요. 오른쪽으로 이어지면 큰 수 쪽(이상·초과), 왼쪽으로 이어지면 작은 수 쪽(이하·미만)이에요.',
      },
    ],
    hints: [
      () => '수직선의 점을 다시 볼까요? ●는 그 수가 들어가고, ○는 들어가지 않아요.',
      ({ lo, hi }) =>
        lo && hi
          ? '왼쪽 끝은 ‘이상’ 또는 ‘초과’, 오른쪽 끝은 ‘이하’ 또는 ‘미만’으로 나타내요.'
          : '선이 오른쪽으로 계속 이어지면 큰 수 쪽(이상·초과), 왼쪽으로 이어지면 작은 수 쪽(이하·미만)이에요.',
      ({ N, M, lo, hi }) => {
        const lines = [];
        if (lo) lines.push(`${N}: ${INCLUDES[lo] ? '●' : '○'} → 이상일까요, 초과일까요?`);
        if (hi) lines.push(`${M}: ${INCLUDES[hi] ? '●' : '○'} → 이하일까요, 미만일까요?`);
        return `따라 풀어 봐요.\n${lines.join('\n')}`;
      },
    ],
    concept: sub === 1 ? CONCEPT_1 : CONCEPT_2,
    solution: ({ N, M, lo, hi }) => {
      const lines = [];
      if (lo) lines.push(`${N}: ${INCLUDES[lo] ? '● → 이상' : '○ → 초과'}`);
      if (hi) lines.push(`${M}: ${INCLUDES[hi] ? '● → 이하' : '○ → 미만'}`);
      if (!lo) lines.push('왼쪽(작은 수 쪽)으로 이어져요.');
      if (!hi) lines.push('오른쪽(큰 수 쪽)으로 이어져요.');
      lines.push(`답: ${describe(N, M, lo, hi)}`);
      return lines;
    },
  });
}

// ── 4. 생활 속 문장제: 조건에 맞는 사람 수 ────────────────

const SCENES = {
  ge: {
    rule: (N) => `이 놀이기구는 키가 ${N} cm 이상인 사람만 탈 수 있어요.`,
    ask: '놀이기구를 탈 수 있는 사람은 모두 몇 명인가요?',
    col: '키(cm)',
    base: [120, 140],
    spread: 8,
  },
  le: {
    rule: (N) => `비행기에 들고 탈 수 있는 가방은 무게가 ${N} kg 이하예요.`,
    ask: '비행기에 들고 탈 수 있는 가방을 가진 사람은 모두 몇 명인가요?',
    col: '가방 무게(kg)',
    base: [7, 12],
    spread: 4,
  },
  gt: {
    rule: (N) => `줄넘기 대회에서 ${N}번 초과로 넘은 학생만 결선에 나가요.`,
    ask: '결선에 나가는 학생은 모두 몇 명인가요?',
    col: '넘은 횟수(번)',
    base: [40, 90],
    spread: 10,
  },
  lt: {
    rule: (N) => `이 박물관은 ${N}세 미만인 어린이는 입장료가 무료예요.`,
    ask: '입장료가 무료인 사람은 모두 몇 명인가요?',
    col: '나이(세)',
    base: [7, 13],
    spread: 5,
  },
};

function wordTemplate(sub) {
  const types = sub === 1 ? ['ge', 'le'] : ['gt', 'lt'];
  return defineTemplate({
    id: `u1-${sub}-word`,
    unit: 1,
    sub,
    style: 'A',
    styleName: '생활 속 문제',
    levels: [1, 2, 3, 4],
    answerType: 'natural',
    weakness: ['condition'],
    make(rng, level) {
      const count = { 1: 5, 2: 6, 3: 7, 4: 8 }[level];
      const atEdge = level >= 3 ? 2 : 1;
      for (;;) {
        const type = rng.pick(types);
        const sc = SCENES[type];
        const N = rng.int(...sc.base);
        const values = Array.from({ length: atEdge }, () => N);
        while (values.length < count) {
          const v = N + rng.int(-sc.spread, sc.spread);
          if (v > 0 && v !== N) values.push(v);
        }
        const names = rng.shuffle(NAMES).slice(0, count);
        const rows = rng.shuffle(values).map((v, i) => [names[i], v]);
        const ins = rows.filter(([, v]) => fits(v, N, type)).length;
        if (ins === 0 || ins === count) continue;
        return { type, N, rows };
      }
    },
    text: ({ type, N }) => `${SCENES[type].rule(N)}\n${SCENES[type].ask}`,
    figure: ({ type, rows }) => ({ type: 'table', head: ['이름', SCENES[type].col], rows }),
    answer: ({ type, N, rows }) => rows.filter(([, v]) => fits(v, N, type)).length,
    verify: ({ type, N, rows }, ans) => rows.reduce((c, [, v]) => c + (fitsBySign(v, N, type) ? 1 : 0), 0) === ans,
    mistakes: [
      {
        id: 'boundary',
        cause: 'concept',
        value: ({ type, N, rows }) => rows.filter(([, v]) => fits(v, N, FLIP[type])).length,
        explain: ({ type, N }) => `값이 딱 ${N}인 사람을 잘못 세었어요. ${RULE[type](N)}`,
      },
      {
        id: 'opposite',
        cause: 'condition',
        value: ({ type, N, rows }) => rows.filter(([, v]) => !fits(v, N, type)).length,
        explain: () => '조건에 맞지 않는 사람을 세었어요. 문제에서 묻는 것이 누구인지 다시 읽어 봐요.',
      },
    ],
    hints: [
      ({ type, N }) => `문제에서 꼭 지켜야 할 조건을 다시 읽어 볼까요? ‘${N} ${WORD[type]}’${particle(WORD[type], '이에요/예요')}. 딱 ${N}인 사람은 들어갈까요?`,
      ({ type, N }) => RULE[type](N),
      ({ type, N, rows }) => {
        const [name, v] = rows[0];
        return `따라 풀어 봐요. 한 사람씩 표시해요.\n${name}: ${v} → ${fits(v, N, type) ? '○' : '×'}\n나머지 사람도 ○, ×를 표시하고 ○의 개수를 세어 보세요.`;
      },
    ],
    concept: conceptFor(sub),
    solution: ({ type, N, rows }) => [
      ...rows.map(([name, v]) => `${name}: ${v} → ${fits(v, N, type) ? '○' : '×'}`),
      `○인 사람: ${rows.filter(([, v]) => fits(v, N, type)).length}명`,
    ],
  });
}

// ── 소단원 3: 수의 범위를 활용한 문제 해결 ─────────────────

// 요금표·체급표: 경계 bounds[0] < bounds[1] < ... 로 칸을 나눈다.
// style 'le': "b 이하 / b 초과 c 이하 / ... / 마지막 초과"
// style 'lt': "b 미만 / b 이상 c 미만 / ... / 마지막 이상"
function bracketLabels(bounds, style, unit) {
  const [inc, exc] = style === 'le' ? ['이하', '초과'] : ['미만', '이상'];
  const labels = [`${bounds[0]} ${unit} ${inc}`];
  for (let i = 1; i < bounds.length; i++) labels.push(`${bounds[i - 1]} ${unit} ${exc} ${bounds[i]} ${unit} ${inc}`);
  labels.push(`${bounds[bounds.length - 1]} ${unit} ${exc}`);
  return labels;
}

function bracketIndex(x, bounds, style) {
  const hiType = style === 'le' ? 'le' : 'lt';
  for (let i = 0; i < bounds.length; i++) if (fitsBySign(x, bounds[i], hiType)) return i;
  return bounds.length;
}

// 경계 포함을 반대로 읽었을 때의 칸
function flippedIndex(x, bounds, style) {
  return bracketIndex(x, bounds, style === 'le' ? 'lt' : 'le');
}

function makeBounds(rng, count, start, step) {
  const bounds = [rng.int(...start)];
  while (bounds.length < count) bounds.push(bounds[bounds.length - 1] + step * rng.int(1, 3));
  return bounds;
}

function pickWeight(rng, bounds, level) {
  const onEdge = rng.chance(level === 1 ? 0.5 : 0.8);
  if (onEdge) return rng.pick(bounds);
  const i = rng.int(0, bounds.length - 1);
  const lo = i === 0 ? 1 : bounds[i - 1] + 1;
  return rng.int(lo, bounds[i] - 1 > lo ? bounds[i] - 1 : lo);
}

const FARE_SCENES = [
  { what: '편지', unit: 'g', title: '편지 요금', start: [5, 10], step: 5, fare0: [400, 450], fareStep: [20, 60] },
  { what: '택배', unit: 'kg', title: '택배 요금', start: [2, 3], step: 2, fare0: [4000, 5000], fareStep: [500, 1500] },
];

const fareTemplate = defineTemplate({
  id: 'u1-3-fare',
  unit: 1,
  sub: 3,
  style: 'A',
  styleName: '요금표 읽기',
  levels: [1, 2, 3, 4],
  answerType: 'natural',
  make(rng, level) {
    const sc = rng.pick(FARE_SCENES);
    const bounds = makeBounds(rng, level >= 3 ? 4 : 3, sc.start, sc.step);
    const style = level >= 2 ? rng.pick(['le', 'lt']) : 'le';
    const fares = [rng.int(...sc.fare0)];
    while (fares.length < bounds.length + 1) {
      fares.push(fares[fares.length - 1] + Math.round(rng.int(...sc.fareStep) / 10) * 10);
    }
    return { sc, bounds, style, fares: fares.map((f) => Math.round(f / 10) * 10), w: pickWeight(rng, bounds, level) };
  },
  text: ({ sc, w }) => `${sc.title}표를 보고, 무게가 ${w} ${sc.unit}인 ${josa(sc.what, '을/를')} 보낼 때 내야 하는 요금은 몇 원인지 구하세요.`,
  figure: ({ sc, bounds, style, fares }) => ({
    type: 'table',
    head: ['무게', '요금(원)'],
    rows: bracketLabels(bounds, style, sc.unit).map((label, i) => [label, fares[i]]),
  }),
  answer: ({ bounds, style, fares, w }) => fares[bracketIndex(w, bounds, style)],
  verify: ({ bounds, style, fares, w }, ans) => {
    const labels = bracketLabels(bounds, style, '');
    const hits = labels.filter((_, i) => {
      const lo = i === 0 ? true : fitsBySign(w, bounds[i - 1], style === 'le' ? 'gt' : 'ge');
      const hi = i === bounds.length ? true : fitsBySign(w, bounds[i], style === 'le' ? 'le' : 'lt');
      return lo && hi;
    });
    return hits.length === 1 && fares[labels.indexOf(hits[0])] === ans;
  },
  mistakes: [
    {
      id: 'boundary',
      cause: 'concept',
      optional: true,
      value: ({ bounds, style, fares, w }) => fares[flippedIndex(w, bounds, style)],
      explain: ({ sc, style, w }) =>
        `무게가 딱 ${w} ${sc.unit}일 때 어느 칸에 들어가는지 헷갈렸어요. ` +
        (style === 'le' ? `‘${w} ${sc.unit} 이하’에는 ${w}${particle(w, '이/가')} 들어가고, ‘${w} ${sc.unit} 초과’에는 들어가지 않아요.` : `‘${w} ${sc.unit} 이상’에는 ${w}${particle(w, '이/가')} 들어가고, ‘${w} ${sc.unit} 미만’에는 들어가지 않아요.`),
    },
  ],
  hints: [
    ({ sc, w }) => `표에서 무게 ${w} ${sc.unit}에 맞는 칸을 찾아볼까요? 칸마다 이상·이하·초과·미만을 잘 읽어요.`,
    ({ style }) => (style === 'le' ? '‘이하’는 그 수가 들어가고, ‘초과’는 들어가지 않아요.' : '‘이상’은 그 수가 들어가고, ‘미만’은 들어가지 않아요.'),
    ({ sc, bounds, style, w }) => {
      const i = bracketIndex(w, bounds, style);
      return `따라 풀어 봐요.\n${w} ${sc.unit}${particle(w, '은/는')} ‘${bracketLabels(bounds, style, sc.unit)[i]}’ 칸에 들어가요.\n이 칸의 요금: □원`;
    },
  ],
  concept: CONCEPT_3,
  solution: ({ sc, bounds, style, fares, w }) => {
    const i = bracketIndex(w, bounds, style);
    return [`${w} ${sc.unit} → ‘${bracketLabels(bounds, style, sc.unit)[i]}’ 칸`, `요금: ${fares[i]}원`];
  },
});

const CLASS_NAMES = ['핀급', '플라이급', '밴텀급', '페더급', '라이트급', '웰터급'];

const classTemplate = defineTemplate({
  id: 'u1-3-class',
  unit: 1,
  sub: 3,
  style: 'A',
  styleName: '체급표 읽기',
  levels: [1, 2, 3, 4],
  answerType: 'choice',
  make(rng, level) {
    const bounds = makeBounds(rng, level >= 3 ? 5 : 4, [30, 36], 2);
    return { bounds, w: pickWeight(rng, bounds, level) };
  },
  text: ({ w }) => `어린이 태권도 체급표예요. 몸무게가 ${w} kg인 선수는 어느 체급에 나가야 하나요?`,
  figure: ({ bounds }) => ({
    type: 'table',
    head: ['체급', '몸무게'],
    rows: bracketLabels(bounds, 'le', 'kg').map((label, i) => [CLASS_NAMES[i], label]),
  }),
  answer: ({ bounds, w }) => CLASS_NAMES[bracketIndex(w, bounds, 'le')],
  options: ({ bounds }) => CLASS_NAMES.slice(0, bounds.length + 1),
  verify: ({ bounds, w }, ans) => {
    const i = CLASS_NAMES.indexOf(ans);
    const lo = i === 0 || w > bounds[i - 1];
    const hi = i === bounds.length || w <= bounds[i];
    return lo && hi;
  },
  mistakes: [
    {
      id: 'boundary',
      cause: 'concept',
      optional: true,
      value: ({ bounds, w }) => CLASS_NAMES[flippedIndex(w, bounds, 'le')],
      explain: ({ w }) => `몸무게가 딱 ${w} kg일 때 어느 칸인지 헷갈렸어요. ‘${w} kg 이하’에는 ${w}${particle(w, '이/가')} 들어가고, ‘${w} kg 초과’에는 들어가지 않아요.`,
    },
  ],
  hints: [
    ({ w }) => `표의 각 칸에서 ${w}${particle(w, '이/가')} 들어가는 칸을 찾아볼까요? ‘이하’와 ‘초과’를 잘 읽어요.`,
    () => '‘이하’는 그 수가 들어가고, ‘초과’는 들어가지 않아요.',
    ({ bounds, w }) => `따라 풀어 봐요.\n${w} kg은 ‘${bracketLabels(bounds, 'le', 'kg')[bracketIndex(w, bounds, 'le')]}’ 칸에 들어가요.\n이 칸의 체급은?`,
  ],
  concept: CONCEPT_3,
  solution: ({ bounds, w }) => {
    const i = bracketIndex(w, bounds, 'le');
    return [`${w} kg → ‘${bracketLabels(bounds, 'le', 'kg')[i]}’`, `체급: ${CLASS_NAMES[i]}`];
  },
});

const PROPS = {
  even: { label: '짝수', test: (x) => x % 2 === 0 },
  odd: { label: '홀수', test: (x) => x % 2 === 1 },
  m3: { label: '3의 배수', test: (x) => x % 3 === 0 },
  m4: { label: '4의 배수', test: (x) => x % 4 === 0 },
};

const conditionsTemplate = defineTemplate({
  id: 'u1-3-conditions',
  unit: 1,
  sub: 3,
  style: 'A',
  styleName: '조건 찾기',
  levels: [1, 2, 3, 4],
  answerType: 'multi',
  weakness: ['condition'],
  make(rng, level) {
    const R = { 1: [5, 30], 2: [20, 60], 3: [50, 150], 4: [100, 400] }[level];
    const props = level <= 2 ? ['even', 'odd'] : ['even', 'odd', 'm3', 'm4'];
    for (;;) {
      const N = rng.int(...R);
      const M = N + rng.int(6, 12);
      const lo = rng.pick(['ge', 'gt']);
      const hi = rng.pick(['le', 'lt']);
      const prop = rng.pick(props);
      const ans = [];
      for (let x = N; x <= M; x++) if (fits(x, N, lo) && fits(x, M, hi) && PROPS[prop].test(x)) ans.push(x);
      if (ans.length >= 2 && ans.length <= 6) return { N, M, lo, hi, prop };
    }
  },
  text: ({ N, M, lo, hi, prop }) =>
    `다음 조건을 모두 만족하는 자연수를 모두 쓰세요.\n① ${N} ${WORD[lo]} ${M} ${WORD[hi]}인 수\n② ${PROPS[prop].label}`,
  answer: ({ N, M, lo, hi, prop }) => {
    const out = [];
    for (let x = N; x <= M; x++) if (fits(x, N, lo) && fits(x, M, hi) && PROPS[prop].test(x)) out.push(x);
    return out;
  },
  verify: ({ N, M, lo, hi, prop }, ans) => {
    for (let x = N - 5; x <= M + 5; x++) {
      const ok = fitsBySign(x, N, lo) && fitsBySign(x, M, hi) && PROPS[prop].test(x);
      if (ok !== ans.includes(x)) return false;
    }
    return true;
  },
  mistakes: [
    {
      id: 'skip-prop',
      cause: 'condition',
      value: ({ N, M, lo, hi }) => {
        const out = [];
        for (let x = N; x <= M; x++) if (fits(x, N, lo) && fits(x, M, hi)) out.push(x);
        return out;
      },
      explain: ({ prop }) => `② 조건 ‘${PROPS[prop].label}’를 빼먹었어요. 조건을 모두 만족해야 해요.`,
    },
    {
      id: 'boundary',
      cause: 'concept',
      optional: true,
      value: ({ N, M, lo, hi, prop }) => {
        const out = [];
        for (let x = N; x <= M; x++) if (fits(x, N, FLIP[lo]) && fits(x, M, FLIP[hi]) && PROPS[prop].test(x)) out.push(x);
        return out;
      },
      explain: ({ N, M, lo, hi }) => `범위의 양 끝 수를 잘못 넣거나 뺐어요. ${RULE[lo](N)} ${RULE[hi](M)}`,
    },
  ],
  hints: [
    () => '문제에서 꼭 지켜야 할 조건을 다시 읽어 볼까요? 조건이 ①, ② 두 개예요. 둘 다 만족해야 해요.',
    ({ N, M, lo, hi }) => `먼저 ① ${N} ${WORD[lo]} ${M} ${WORD[hi]}인 수를 모두 써 보세요. ${josa(N, '과/와')} ${josa(M, '이/가')} 들어가는지 확인해요.`,
    ({ N, M, lo, hi, prop }) => {
      const first = INCLUDES[lo] ? N : N + 1;
      const last = INCLUDES[hi] ? M : M - 1;
      return `따라 풀어 봐요.\n① 만족: ${first}부터 ${last}까지\n② 이 중에서 ${PROPS[prop].label}만 남기면 → □`;
    },
  ],
  concept: CONCEPT_3,
  solution: ({ N, M, lo, hi, prop }) => {
    const first = INCLUDES[lo] ? N : N + 1;
    const last = INCLUDES[hi] ? M : M - 1;
    const out = [];
    for (let x = first; x <= last; x++) if (PROPS[prop].test(x)) out.push(x);
    return [`① 만족하는 수: ${first}부터 ${last}까지`, `② ${PROPS[prop].label}: ${out.join(', ')}`];
  },
});

const elevatorTemplate = defineTemplate({
  id: 'u1-3-elevator',
  unit: 1,
  sub: 3,
  style: 'A',
  styleName: '문장제',
  levels: [1, 2, 3, 4],
  answerType: 'natural',
  weakness: ['condition'],
  make(rng, level) {
    const n = { 1: 2, 2: 3, 3: 3, 4: 4 }[level];
    const weights = Array.from({ length: n }, () => rng.int(30, 70));
    const S = weights.reduce((a, b) => a + b, 0);
    const L = Math.ceil((S + rng.int(15, 80)) / 10) * 10;
    const names = rng.shuffle(NAMES).slice(0, n);
    return { weights, names, L, style: rng.pick(['le', 'lt']) };
  },
  text: ({ weights, names, L, style }) =>
    `이 엘리베이터는 실은 무게의 합이 ${L} kg ${WORD[style]}일 때만 움직여요. ` +
    `${names.map((nm, i) => `${nm}(${weights[i]} kg)`).join(', ')} ${weights.length}명이 탔어요. ` +
    `엘리베이터가 움직이려면 짐을 최대 몇 kg까지 더 실을 수 있나요? (짐의 무게는 자연수예요.)`,
  answer: ({ weights, L, style }) => L - weights.reduce((a, b) => a + b, 0) - (style === 'lt' ? 1 : 0),
  verify: ({ weights, L, style }, ans) => {
    const S = weights.reduce((a, b) => a + b, 0);
    return fitsBySign(S + ans, L, style) && !fitsBySign(S + ans + 1, L, style);
  },
  mistakes: [
    {
      id: 'boundary',
      cause: 'concept',
      value: ({ weights, L, style }) => L - weights.reduce((a, b) => a + b, 0) - (style === 'lt' ? 0 : 1),
      explain: ({ L, style }) => (style === 'le' ? `‘${L} kg 이하’에는 ${L} kg도 들어가요. 합이 딱 ${L} kg이어도 움직여요.` : `‘${L} kg 미만’에는 ${L} kg이 들어가지 않아요. 합이 ${L} kg이면 움직이지 않아요.`),
    },
    {
      id: 'skip-person',
      cause: 'condition',
      value: ({ weights, L, style }) => L - weights.slice(0, -1).reduce((a, b) => a + b, 0) - (style === 'lt' ? 1 : 0),
      explain: ({ names }) => `${names[names.length - 1]}의 몸무게를 빼먹었어요. 탄 사람 ${names.length}명의 몸무게를 모두 더해야 해요.`,
    },
  ],
  hints: [
    ({ L, style, names }) => `문제에서 꼭 지켜야 할 조건을 다시 읽어 볼까요? 탄 사람은 ${names.length}명이고, 무게의 합이 ‘${L} kg ${WORD[style]}’여야 해요.`,
    ({ weights }) => `먼저 탄 사람들의 몸무게를 모두 더해 보세요. ${weights.join(' + ')} = □`,
    ({ weights, L, style }) => {
      const S = weights.reduce((a, b) => a + b, 0);
      return `따라 풀어 봐요.\n사람 무게의 합: ${S} kg\n${L} − ${S} = ${L - S}\n${style === 'le' ? `‘이하’라서 ${L} kg이 되어도 괜찮아요.` : `‘미만’이라서 ${L} kg이 되면 안 돼요.`} → 답: □ kg`;
    },
  ],
  concept: CONCEPT_3,
  solution: ({ weights, L, style }) => {
    const S = weights.reduce((a, b) => a + b, 0);
    const ans = L - S - (style === 'lt' ? 1 : 0);
    return [
      `사람 무게의 합: ${weights.join(' + ')} = ${S}(kg)`,
      style === 'le' ? `${L} kg 이하이므로 짐은 ${L} − ${S} = ${ans}(kg)까지` : `${L} kg 미만이므로 합이 ${L - 1} kg까지 → 짐은 ${L - 1} − ${S} = ${ans}(kg)까지`,
    ];
  },
});

export default [
  pickTemplate(1), countTemplate(1), lineTemplate(1), wordTemplate(1),
  pickTemplate(2), countTemplate(2), lineTemplate(2), wordTemplate(2),
  fareTemplate, classTemplate, conditionsTemplate, elevatorTemplate,
];
