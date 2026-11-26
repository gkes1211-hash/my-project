// 틀렸을 때의 흐름 (기획서 3번의 4~6번). 화면과 상관없는 순수 로직.
//
// 4. 틀리면 정답을 바로 보여주지 않는다.
//    아이가 "어디서 틀렸을까?"를 고른다 → 앱이 오답 패턴으로 진짜 원인을 찾는다
//    → 고른 원인과 다르면 알려 준다 → 패턴이 없으면 1단계 힌트부터 → 개념 설명
// 5. 같은 문제를 다시 푼다. 틀릴 때마다 힌트를 한 단계씩 더 준다. (최대 3단계)
//    3단계 힌트 뒤에도 틀리면 풀이 과정과 정답을 보여 주고, 보고 따라 써서 맞히게 한다.
// 6. 다시 맞히면 비슷한 문제 5개. 4개 이상이면 통과 도장.
//    3개 이하면 틀린 문제마다 4~5번을 거친 뒤 5개를 한 번 더 (최대 2회).
//    그래도 어려우면 "다음에 다시 도전" 목록에 넣는다.
import { diagnose } from './diagnose.js';
import { CAUSES, generate } from './template.js';
import { particle } from '../core/words.js';

export const SELF_CHOICES = [
  { key: 'concept', label: '개념을 몰랐어요' },
  { key: 'calc', label: '계산하다 실수했어요' },
  { key: 'condition', label: '문제를 잘못 읽었어요' },
  { key: 'unknown', label: '잘 모르겠어요' },
];

export const MAX_HINT = 3;
export const CHALLENGE_SIZE = 5;
export const PASS_MIN = 4;
export const MAX_ROUNDS = 2;

const TIPS = {
  concept: '개념 설명을 천천히 한 번 더 읽어 봐요.',
  calc: '계산을 한 줄씩 다시 확인해 봐요.',
  condition: '다음에는 문제의 조건에 밑줄을 그으면서 읽어 봐요.',
  reduce: '답을 쓰기 전에 약분과 대분수를 끝까지 확인해 봐요.',
};

// ── 4~5. 틀린 문제 다시 풀기 ─────────────────────────────

// value: 아이가 처음 쓴 틀린 답의 값
export function startRemedy(problem, value) {
  const found = diagnose(problem, value);
  return {
    problem,
    firstValue: value,
    found, // 처음 틀린 답의 진짜 원인 (없으면 null)
    selfChoice: null,
    // 원인을 찾았으면 원인 설명부터, 못 찾았으면 1단계 힌트부터 준다.
    hintLevel: found ? 0 : 1,
    tries: 1,
    showSolution: false,
    solved: false,
  };
}

// 아이가 고른 원인과 진짜 원인을 비교한다.
export function compareSelfCheck(rem, choice) {
  rem.selfChoice = choice;
  const picked = SELF_CHOICES.find((c) => c.key === choice);
  if (!rem.found) {
    return { kind: 'no-pattern', message: '자주 하는 실수와 모양이 달라서 원인을 딱 집기 어려워요. 어디서 다른지 같이 찾아볼까요?' };
  }
  const actual = rem.found.cause;
  if (choice === 'unknown') {
    return { kind: 'unsure', actual, message: `괜찮아요. 틀린 까닭은 ‘${CAUSES[actual]}’${particle(CAUSES[actual], '이에요/예요')}. ${TIPS[actual]}` };
  }
  if (choice === actual) {
    return { kind: 'match', actual, message: '맞아요! 틀린 까닭을 스스로 잘 찾았어요.' };
  }
  return {
    kind: 'mismatch',
    actual,
    message: `‘${picked.label}’를 골랐는데, 실제로는 ‘${CAUSES[actual]}’ 쪽이에요. ${TIPS[actual]}`,
  };
}

// 다시 푼 답의 채점 결과(grade의 결과)를 넣는다. ('correct' 또는 'wrong'만)
export function retryRemedy(rem, result) {
  if (result.result === 'correct') {
    rem.solved = true;
    return { status: 'correct' };
  }
  rem.tries++;
  const found = diagnose(rem.problem, result.value);
  if (rem.hintLevel < MAX_HINT) {
    rem.hintLevel++;
  } else {
    rem.showSolution = true;
  }
  return { status: 'wrong', found, hintLevel: rem.hintLevel, showSolution: rem.showSolution, message: result.message ?? '' };
}

// ── 6. 비슷한 문제 도전 ──────────────────────────────────

// 같은 틀 + (같은 소단원에서) 같은 오답 패턴을 가진 다른 틀
export function similarPool(base, mistakeId, allTemplates) {
  const others = mistakeId
    ? allTemplates.filter((t) => t.id !== base.id && t.unit === base.unit && t.sub === base.sub && t.mistakes.some((m) => m.id === mistakeId))
    : [];
  return { base, others };
}

export function startChallenge({ base, mistakeId = null, allTemplates, level }) {
  return {
    pool: similarPool(base, mistakeId, allTemplates),
    level,
    round: 1,
    problems: [], // 이번 회차에 낸 문제
    results: [], // { correct, value }
  };
}

export function nextChallengeProblem(ch, rng, recent = []) {
  const { base, others } = ch.pool;
  const t = others.length && rng.chance(0.3) ? rng.pick(others) : base;
  const level = t.levels.includes(ch.level) ? ch.level : t.levels[t.levels.length - 1];
  const p = generate(t, level, rng, { avoid: new Set([...recent, ...ch.problems.map((x) => x.key)]) });
  ch.problems.push(p);
  recent.push(p.key);
  return p;
}

export function recordChallenge(ch, correct, value) {
  ch.results.push({ correct, value });
}

export const challengeDone = (ch) => ch.results.length >= CHALLENGE_SIZE;

export function challengeVerdict(ch) {
  const correct = ch.results.filter((r) => r.correct).length;
  const passed = correct >= PASS_MIN;
  return {
    correct,
    passed,
    // 통과 못 했을 때: 다시 볼 틀린 문제들, 한 번 더 도전할 수 있는지
    wrong: ch.problems.map((p, i) => ({ problem: p, value: ch.results[i]?.value })).filter((_, i) => !ch.results[i]?.correct),
    canRetry: !passed && ch.round < MAX_ROUNDS,
  };
}

export function nextRound(ch) {
  ch.round++;
  ch.problems = [];
  ch.results = [];
}
