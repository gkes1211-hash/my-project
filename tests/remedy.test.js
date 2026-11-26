// 틀렸을 때 흐름 검사 (기획서 3번의 4~6번)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_TEMPLATES } from '../js/templates/index.js';
import { generate } from '../js/engine/template.js';
import { grade } from '../js/engine/grader.js';
import {
  startRemedy, compareSelfCheck, retryRemedy, MAX_HINT,
  startChallenge, nextChallengeProblem, recordChallenge, challengeDone, challengeVerdict, nextRound,
  similarPool, CHALLENGE_SIZE,
} from '../js/engine/remedy.js';
import { makeRng } from '../js/core/random.js';
import { Frac } from '../js/core/fraction.js';

const byId = (id) => ALL_TEMPLATES.find((t) => t.id === id);

// 조건 놓침 패턴이 있는 문장제 하나 (한 명에게 k개씩)
function wordProblem() {
  return generate(byId('u2-1-word-each'), 2, makeRng(11));
}

test('오답 패턴과 같은 답이면 진짜 원인을 찾고, 힌트는 아직 주지 않는다', () => {
  const p = wordProblem();
  const skip = p.mistakes.find((m) => m.id === 'skip-each');
  const rem = startRemedy(p, skip.value);
  assert.equal(rem.found.cause, 'condition');
  assert.equal(rem.hintLevel, 0);
});

test('아이가 고른 원인과 진짜 원인이 같으면 칭찬, 다르면 알려 준다', () => {
  const p = wordProblem();
  const skip = p.mistakes.find((m) => m.id === 'skip-each');
  assert.equal(compareSelfCheck(startRemedy(p, skip.value), 'condition').kind, 'match');
  const mis = compareSelfCheck(startRemedy(p, skip.value), 'calc');
  assert.equal(mis.kind, 'mismatch');
  assert.match(mis.message, /조건 놓침/);
  assert.equal(compareSelfCheck(startRemedy(p, skip.value), 'unknown').kind, 'unsure');
});

test('어떤 패턴과도 맞지 않으면 1단계 힌트부터 준다', () => {
  const p = wordProblem();
  const rem = startRemedy(p, new Frac(999, 7));
  assert.equal(rem.found, null);
  assert.equal(rem.hintLevel, 1);
  assert.equal(compareSelfCheck(rem, 'concept').kind, 'no-pattern');
});

test('다시 틀릴 때마다 힌트가 한 단계씩, 3단계 다음에는 풀이를 보여 준다', () => {
  const p = wordProblem();
  const wrong = { result: 'wrong', value: new Frac(999, 7) };
  const rem = startRemedy(p, p.mistakes[0].value); // 힌트 0
  assert.equal(retryRemedy(rem, wrong).hintLevel, 1);
  assert.equal(retryRemedy(rem, wrong).hintLevel, 2);
  const third = retryRemedy(rem, wrong);
  assert.equal(third.hintLevel, MAX_HINT);
  assert.equal(third.showSolution, false);
  const fourth = retryRemedy(rem, wrong);
  assert.equal(fourth.hintLevel, MAX_HINT);
  assert.equal(fourth.showSolution, true);
  assert.equal(retryRemedy(rem, { result: 'correct' }).status, 'correct');
  assert.equal(rem.solved, true);
});

test('다시 풀 때 틀린 답도 원인을 진단한다', () => {
  const p = wordProblem();
  const rem = startRemedy(p, new Frac(999, 7));
  const people = p.mistakes.find((m) => m.id === 'skip-people');
  const r = retryRemedy(rem, grade(p, { whole: '', num: String(people.value.n), den: String(people.value.d) }));
  assert.equal(r.status, 'wrong');
  assert.equal(r.found?.id, 'skip-people');
});

test('비슷한 문제: 같은 틀과, 같은 소단원에서 같은 오답 패턴을 가진 틀', () => {
  const base = byId('u1-1-pick');
  const { others } = similarPool(base, 'boundary', ALL_TEMPLATES);
  assert.ok(others.length >= 1);
  assert.ok(others.every((t) => t.sub === base.sub && t.mistakes.some((m) => m.id === 'boundary')));
  assert.deepEqual(similarPool(base, null, ALL_TEMPLATES).others, []);
});

function runChallenge(ch, rng, correctCount) {
  for (let i = 0; i < CHALLENGE_SIZE; i++) {
    const p = nextChallengeProblem(ch, rng, []);
    recordChallenge(ch, i < correctCount, p.answer);
  }
}

test('비슷한 문제 5개: 서로 다른 문제이고, 4개 이상 맞히면 통과', () => {
  const rng = makeRng(5);
  const ch = startChallenge({ base: byId('u1-4-nat'), mistakeId: 'mode-down', allTemplates: ALL_TEMPLATES, level: 2 });
  runChallenge(ch, rng, 4);
  assert.equal(challengeDone(ch), true);
  assert.equal(new Set(ch.problems.map((p) => p.key)).size, CHALLENGE_SIZE);
  assert.ok(ch.problems.every((p) => p.level === 2 || !byId(p.templateId).levels.includes(2)));
  const v = challengeVerdict(ch);
  assert.equal(v.passed, true);
  assert.equal(v.correct, 4);
});

test('3개 이하면 틀린 문제를 다시 보고 한 번 더 (최대 2회)', () => {
  const rng = makeRng(6);
  const ch = startChallenge({ base: byId('u1-6-nat'), allTemplates: ALL_TEMPLATES, level: 1 });
  runChallenge(ch, rng, 3);
  let v = challengeVerdict(ch);
  assert.equal(v.passed, false);
  assert.equal(v.wrong.length, 2);
  assert.equal(v.canRetry, true);
  nextRound(ch);
  assert.equal(ch.round, 2);
  runChallenge(ch, rng, 2);
  v = challengeVerdict(ch);
  assert.equal(v.passed, false);
  assert.equal(v.canRetry, false); // 2회차도 못 넘으면 "다음에 다시 도전"
});
