// 2단원 분수의 곱셈 문제 틀
import { Frac, gcd } from '../core/fraction.js';
import { NAMES, MEASURED_ITEMS, josa, ieyo, particle } from '../core/words.js';
import { defineTemplate } from '../engine/template.js';
import { fracChain } from '../engine/values.js';

// 분모 b 범위 안에서 기약 진분수 a/b 하나 고르기
function properFrac(rng, [bMin, bMax]) {
  for (;;) {
    const b = rng.int(bMin, bMax);
    const a = rng.int(1, b - 1);
    if (gcd(a, b) === 1) return { a, b };
  }
}

// 같은 분수를 count번 더하기 (정답을 다른 방법으로 확인할 때 쓴다)
function repeatAdd(f, count) {
  let sum = new Frac(0);
  for (let i = 0; i < count; i++) sum = sum.add(f);
  return sum;
}

const FINISH = '약분할 수 있으면 끝까지 약분하고, 가분수면 대분수로 바꿔요.';

// ── 소단원 1: (분수)×(자연수) ──────────────────────────────

const properTimesNat = defineTemplate({
  id: 'u2-1-proper-x-nat',
  unit: 2,
  sub: 1,
  style: 'A',
  styleName: '진분수×자연수',
  levels: [1, 2, 3, 4],
  answerType: 'fraction',
  weakness: ['reduce'],
  make(rng, level) {
    const R = {
      1: { b: [2, 6], n: [2, 5] },
      2: { b: [3, 9], n: [2, 9] },
      3: { b: [4, 12], n: [3, 15] },
      4: { b: [6, 12], n: [10, 30] },
    }[level];
    for (;;) {
      const { a, b } = properFrac(rng, R.b);
      const n = rng.int(...R.n);
      // 어려움부터는 약분이 꼭 필요한 문제만 낸다.
      if (level >= 3 && gcd(b, n) === 1) continue;
      return { a, b, n };
    }
  },
  text: ({ a, b, n }) => `계산해 보세요.\n[[${a}/${b}]] × ${n}`,
  answer: ({ a, b, n }) => new Frac(a * n, b),
  verify: ({ a, b, n }, ans) => repeatAdd(new Frac(a, b), n).eq(ans),
  mistakes: [
    {
      id: 'mul-both',
      cause: 'concept',
      value: ({ a, b, n }) => new Frac(a * n, b * n),
      explain: ({ n }) => `분모에도 ${josa(n, '을/를')} 곱했어요. (분수)×(자연수)는 분모는 그대로 두고 분자에만 자연수를 곱해요.`,
    },
    {
      id: 'mul-den',
      cause: 'concept',
      value: ({ a, b, n }) => new Frac(a, b * n),
      explain: ({ n }) => `분자가 아니라 분모에 ${josa(n, '을/를')} 곱했어요. 자연수는 분자에 곱해야 해요.`,
    },
    {
      id: 'add-instead',
      cause: 'concept',
      value: ({ a, b, n }) => new Frac(a, b).add(n),
      explain: ({ n }) => `곱해야 하는데 ${josa(n, '을/를')} 더했어요.`,
    },
  ],
  hints: [
    // 분수 a/b는 "b분의 a"로 읽으므로 조사는 분자 a에 맞춘다.
    ({ a, b, n }) => `[[${a}/${b}]] × ${josa(n, '은/는')} [[${a}/${b}]]${particle(a, '을/를')} ${n}번 더한 것과 같아요.`,
    ({ a, b, n }) => `분모 ${josa(b, '은/는')} 그대로 두고, 분자 ${a}에만 ${josa(n, '을/를')} 곱해 보세요.`,
    ({ a, b, n }) => `따라 풀어 봐요.\n[[${a}/${b}]] × ${n} = [[${a}×${n}/${b}]] = [[□/${b}]]\n□를 구한 다음, ${FINISH}`,
  ],
  concept:
    '(분수)×(자연수)는 분수를 자연수만큼 여러 번 더한 것과 같아요. 그래서 분모는 그대로 두고 분자에만 자연수를 곱해요. ' +
    '예를 들어 [[2/5]] × 3 = [[2×3/5]] = [[6/5]] = [[1 1/5]]이에요. 계산한 뒤에는 약분을 끝까지 하고, 가분수는 대분수로 바꿔요.',
  solution: ({ a, b, n }) => [`[[${a}/${b}]] × ${n} = [[${a}×${n}/${b}]] = ${fracChain(a * n, b).join(' = ')}`],
});

const mixedTimesNat = defineTemplate({
  id: 'u2-1-mixed-x-nat',
  unit: 2,
  sub: 1,
  style: 'A',
  styleName: '대분수×자연수',
  levels: [1, 2, 3, 4],
  answerType: 'fraction',
  weakness: ['reduce'],
  make(rng, level) {
    const R = {
      1: { w: [1, 2], b: [2, 5], n: [2, 3] },
      2: { w: [1, 3], b: [3, 8], n: [2, 5] },
      3: { w: [1, 4], b: [3, 10], n: [3, 9] },
      4: { w: [2, 6], b: [4, 12], n: [4, 12] },
    }[level];
    const { a, b } = properFrac(rng, R.b);
    return { w: rng.int(...R.w), a, b, n: rng.int(...R.n) };
  },
  text: ({ w, a, b, n }) => `계산해 보세요.\n[[${w} ${a}/${b}]] × ${n}`,
  answer: ({ w, a, b, n }) => Frac.mixed(w, a, b).mul(n),
  verify: ({ w, a, b, n }, ans) => repeatAdd(Frac.mixed(w, a, b), n).eq(ans),
  mistakes: [
    {
      id: 'whole-only',
      cause: 'concept',
      value: ({ w, a, b, n }) => new Frac(w * n).add(new Frac(a, b)),
      explain: ({ w, n }) => `자연수 부분 ${w}에만 ${josa(n, '을/를')} 곱하고, 분수 부분에는 곱하지 않았어요.`,
    },
    {
      id: 'frac-only',
      cause: 'concept',
      value: ({ w, a, b, n }) => new Frac(w).add(new Frac(a * n, b)),
      explain: ({ n }) => `분수 부분에만 ${josa(n, '을/를')} 곱하고, 자연수 부분에는 곱하지 않았어요.`,
    },
    {
      id: 'mul-both',
      cause: 'concept',
      value: ({ w, a, b }) => Frac.mixed(w, a, b),
      explain: ({ n }) => `분모에도 ${josa(n, '을/를')} 곱했어요. 분모는 그대로 두고 분자에만 곱해요.`,
    },
  ],
  hints: [
    ({ w, a, b }) => `대분수를 가분수로 바꾸면 계산하기 쉬워요.\n[[${w} ${a}/${b}]] = [[□/${b}]]`,
    ({ w, a, b, n }) => `[[${w} ${a}/${b}]] = [[${w * b + a}/${b}]]예요. 이제 분자 ${w * b + a}에 ${josa(n, '을/를')} 곱해 보세요.`,
    ({ w, a, b, n }) =>
      `따라 풀어 봐요.\n[[${w} ${a}/${b}]] × ${n} = [[${w * b + a}/${b}]] × ${n} = [[${w * b + a}×${n}/${b}]] = [[□/${b}]]\n□를 구한 다음, ${FINISH}`,
  ],
  concept:
    '(대분수)×(자연수)는 대분수를 가분수로 바꾼 뒤 분자에 자연수를 곱하면 돼요. ' +
    '예를 들어 [[1 1/3]] × 2 = [[4/3]] × 2 = [[8/3]] = [[2 2/3]]이에요. ' +
    '자연수 부분과 분수 부분에 각각 곱해서 더해도 되지만, 둘 중 하나에만 곱하면 안 돼요.',
  solution: ({ w, a, b, n }) => {
    const top = w * b + a;
    return [`[[${w} ${a}/${b}]] × ${n} = [[${top}/${b}]] × ${n} = [[${top}×${n}/${b}]] = ${fracChain(top * n, b).join(' = ')}`];
  },
});

// 약점 1(조건 놓침): "한 명에게 k개씩" 조건을 빼먹는 실수를 잡는 문장제
const wordEach = defineTemplate({
  id: 'u2-1-word-each',
  unit: 2,
  sub: 1,
  style: 'A',
  styleName: '문장제',
  levels: [1, 2, 3, 4],
  answerType: 'fraction',
  weakness: ['condition', 'reduce'],
  make(rng, level) {
    const R = {
      1: { b: [2, 5], n: [2, 4], k: [2, 3] },
      2: { b: [3, 8], n: [2, 6], k: [2, 4] },
      3: { b: [3, 10], n: [3, 8], k: [2, 5] },
      4: { b: [4, 12], n: [4, 12], k: [3, 6] },
    }[level];
    for (;;) {
      const { a, b } = properFrac(rng, R.b);
      const n = rng.int(...R.n);
      const k = rng.int(...R.k);
      if (n === k) continue; // 두 조건 중 무엇을 놓쳤는지 구분할 수 있게
      return { a, b, n, k, name: rng.pick(NAMES), item: rng.pick(MEASURED_ITEMS) };
    }
  },
  text: ({ a, b, n, k, name, item: it }) =>
    `${josa(name, '은/는')} 친구 ${n}명에게 ${josa(it.thing, '을/를')} 한 명에게 ${k}${it.counter}씩 나누어 주었어요. ` +
    `${it.thing} 한 ${it.counter}의 ${josa(it.prop, '이/가')} [[${a}/${b}]] ${it.unit}일 때, ` +
    `나누어 준 ${it.thing}의 ${josa(it.prop, '은/는')} 모두 몇 ${it.unit}인가요?`,
  answer: ({ a, b, n, k }) => new Frac(a * n * k, b),
  verify: ({ a, b, n, k }, ans) => repeatAdd(new Frac(a, b), n * k).eq(ans),
  mistakes: [
    {
      id: 'skip-each',
      cause: 'condition',
      value: ({ a, b, n }) => new Frac(a * n, b),
      explain: ({ n, k, item: it }) =>
        `‘한 명에게 ${k}${it.counter}씩’ 조건을 빼먹었어요. 나누어 준 ${josa(it.thing, '은/는')} ${josa(`${n}${it.counter}`, '이/가')} 아니라 ${n}×${k}=${ieyo(`${n * k}${it.counter}`)}.`,
    },
    {
      id: 'skip-people',
      cause: 'condition',
      value: ({ a, b, k }) => new Frac(a * k, b),
      explain: ({ n }) => `친구 수 ${n}명을 곱하지 않았어요. 친구 한 명이 받은 양만 구했어요.`,
    },
    {
      id: 'mul-both',
      cause: 'concept',
      value: ({ a, b }) => new Frac(a, b),
      explain: () => '분모에도 자연수를 곱했어요. 분모는 그대로 두고 분자에만 곱해요.',
    },
  ],
  hints: [
    ({ k, item: it }) => `문제에서 꼭 지켜야 할 조건을 다시 읽어 볼까요? ‘한 명에게 ${k}${it.counter}씩’이라는 말이 있어요.`,
    ({ n, k, item: it }) => `먼저 나누어 준 ${josa(it.thing, '이/가')} 모두 몇 ${it.counter}인지 구해 보세요. (${n}명 × ${k}${it.counter})`,
    ({ a, b, n, k, item: it }) =>
      `따라 풀어 봐요.\n나누어 준 ${it.thing}: ${n} × ${k} = □(${it.counter})\n전체 ${it.prop}: [[${a}/${b}]] × □ = [[${a}×□/${b}]]\n${FINISH}`,
  ],
  concept:
    '문장제는 먼저 무엇을 몇 번 곱해야 하는지 찾아야 해요. ‘한 명에게 2개씩’처럼 ‘씩’이 나오면 사람 수와 개수를 곱해서 전체 개수부터 구해요. ' +
    '예를 들어 3명에게 2개씩 주면 3 × 2 = 6개예요. 그다음 한 개의 양에 전체 개수를 곱해요.',
  solution: ({ a, b, n, k, item: it }) => [
    `나누어 준 ${it.thing}: ${n} × ${k} = ${n * k}(${it.counter})`,
    `전체 ${it.prop}: [[${a}/${b}]] × ${n * k} = [[${a}×${n * k}/${b}]] = ${fracChain(a * n * k, b).join(' = ')} (${it.unit})`,
  ],
});

export default [properTimesNat, mixedTimesNat, wordEach];
