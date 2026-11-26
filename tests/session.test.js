// 무한 모드 규칙과 기록 저장 검사
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_TEMPLATES, templatesFor } from '../js/templates/index.js';
import { createSession, nextProblem, recordResult, adjustLevel, summarize, RECENT_LIMIT } from '../js/engine/session.js';
import { createStore } from '../js/store.js';
import { makeRng } from '../js/core/random.js';

const session = (opts = {}) => createSession({ templates: ALL_TEMPLATES, rng: makeRng(3), ...opts });

test('3문제 연속 맞히면 한 단계 어려워진다', () => {
  const s = session();
  assert.equal(adjustLevel(s, true), null);
  assert.equal(adjustLevel(s, true), null);
  assert.equal(adjustLevel(s, true), 'up');
  assert.equal(s.level, 2);
});

test('2문제 연속 틀리면 한 단계 쉬워진다', () => {
  const s = session({ level: 3 });
  assert.equal(adjustLevel(s, false), null);
  assert.equal(adjustLevel(s, false), 'down');
  assert.equal(s.level, 2);
});

test('맞히다 틀리면 연속 기록이 처음부터 다시 센다', () => {
  const s = session();
  adjustLevel(s, true);
  adjustLevel(s, true);
  adjustLevel(s, false);
  adjustLevel(s, true);
  adjustLevel(s, true);
  assert.equal(s.level, 1);
});

test('난이도는 1(쉬움)~4(도전)를 벗어나지 않는다', () => {
  const s = session({ level: 4 });
  for (let i = 0; i < 9; i++) adjustLevel(s, true);
  assert.equal(s.level, 4);
  const t = session({ level: 1 });
  for (let i = 0; i < 6; i++) adjustLevel(t, false);
  assert.equal(t.level, 1);
});

test('최근 50문제와 같은 문제가 다시 나오지 않는다', () => {
  const s = session({ templates: templatesFor(1) });
  const keys = [];
  for (let i = 0; i < 300; i++) {
    const p = nextProblem(s);
    assert.ok(!keys.slice(-RECENT_LIMIT).includes(p.key), `${i}번째 문제가 최근에 나온 문제예요`);
    keys.push(p.key);
  }
  assert.equal(s.recent.length, RECENT_LIMIT);
});

test('같은 스타일이 3번 연속 나오지 않는다', () => {
  const s = session({ templates: templatesFor(1) });
  const styles = [];
  for (let i = 0; i < 500; i++) styles.push(nextProblem(s).styleName);
  for (let i = 2; i < styles.length; i++) {
    assert.ok(!(styles[i] === styles[i - 1] && styles[i] === styles[i - 2]), `${i}: ${styles[i]} 3번 연속`);
  }
});

test('소단원이 골고루 섞인다', () => {
  const s = session({ templates: templatesFor(1) });
  const bySub = {};
  for (let i = 0; i < 700; i++) {
    const p = nextProblem(s);
    bySub[p.sub] = (bySub[p.sub] ?? 0) + 1;
  }
  const counts = Object.values(bySub);
  assert.equal(counts.length, 7);
  assert.ok(Math.min(...counts) >= 60, `가장 적게 나온 소단원: ${Math.min(...counts)}번 ${JSON.stringify(bySub)}`);
});

test('약점 유형(조건 놓침 등)이 조금 더 자주 나온다', () => {
  const pool = templatesFor(1, 3); // 약점 틀 2개 + 일반 틀 2개
  const s = session({ templates: pool });
  let weak = 0;
  for (let i = 0; i < 800; i++) if (nextProblem(s).weakness.length) weak++;
  assert.ok(weak > 400, `약점 유형 ${weak}/800`);
});

test('10문제 세트는 10문제에서 끝나고, 무한 모드는 20문제마다 쉬어 가기', () => {
  const set = session({ mode: 'set' });
  let r;
  for (let i = 0; i < 10; i++) r = recordResult(set, nextProblem(set), true);
  assert.equal(r.finished, true);

  const inf = session();
  const breaks = [];
  for (let i = 1; i <= 40; i++) if (recordResult(inf, nextProblem(inf), i % 2 === 0).breakTime) breaks.push(i);
  assert.deepEqual(breaks, [20, 40]);
});

test('오늘의 결과 요약', () => {
  const s = session();
  const p1 = nextProblem(s);
  recordResult(s, p1, true);
  const p2 = nextProblem(s);
  recordResult(s, p2, false, 'concept');
  const sum = summarize(s);
  assert.equal(sum.solved, 2);
  assert.equal(sum.rate, 50);
  assert.equal(sum.wrongTypes[0].templateId, p2.templateId);
});

test('기록 저장: 기기에 저장되고 다시 읽힌다', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const a = createStore(storage);
  const day = new Date(2026, 10, 26);
  a.recordAttempt({ templateId: 'u1-1-pick', correct: true, date: day });
  a.recordAttempt({ templateId: 'u1-1-pick', correct: false, cause: 'concept', date: day });
  a.setLevel('u1', 3);
  const b = createStore(storage);
  assert.deepEqual(b.today(day), { solved: 2, correct: 1 });
  assert.equal(b.rateFor(templatesFor(1, 1)), 50);
  assert.equal(b.levelFor('u1'), 3);
  assert.equal(b.data.causes.concept, 1);
});

test('기록 저장: 저장소가 고장 나도 앱이 멈추지 않는다', () => {
  const broken = { getItem: () => '{깨진 글자', setItem: () => { throw new Error('막힘'); } };
  const st = createStore(broken);
  st.recordAttempt({ templateId: 'x', correct: true });
  assert.equal(st.today().solved, 1);
  const none = createStore(null);
  assert.equal(none.levelFor('all'), 1);
});
