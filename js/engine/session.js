// 무한 모드 / 10문제 세트 (기획서 11번)
// 화면과 상관없는 순수한 로직이라 자동 테스트로 확인할 수 있다.
//
// - 난이도 자동 조절: 3문제 연속 정답 → 한 단계 어렵게, 2문제 연속 오답 → 한 단계 쉽게
// - 최근 50문제와 같은 문제는 다시 내지 않는다.
// - 소단원과 문제 스타일이 골고루 섞이게, 약점 유형은 조금 더 자주
// - 같은 스타일이 3번 연속 나오지 않게
// - 20문제마다 쉬어 가기 안내
import { generate } from './template.js';

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 4;
export const UP_AFTER = 3;
export const DOWN_AFTER = 2;
export const RECENT_LIMIT = 50;
export const BREAK_EVERY = 20;
export const SET_SIZE = 10;
const WEAK_BONUS = 1.5;

// templates: 출제할 문제 틀 목록, mode: 'infinite' | 'set'
// recent: 최근에 낸 문제 key 배열 (기기에 저장된 것을 넘겨받아 함께 갱신한다)
export function createSession({ templates, mode = 'infinite', level = 1, rng, recent = [] }) {
  if (!templates.length) throw new Error('출제할 문제 틀이 없어요');
  return {
    templates,
    mode,
    level,
    rng,
    recent,
    upStreak: 0,
    downStreak: 0,
    servedByTemplate: {},
    servedBySub: {},
    styleHistory: [],
    lastTemplateId: null,
    solved: 0,
    correct: 0,
    streak: 0,
    bestStreak: 0,
    results: [], // { templateId, unit, sub, styleName, correct, cause }
  };
}

const subKey = (t) => `${t.unit}-${t.sub}`;

export function pickTemplate(s) {
  let cands = s.templates.filter((t) => t.levels.includes(s.level));
  if (!cands.length) cands = s.templates;
  if (cands.length > 1) {
    const notLast = cands.filter((t) => t.id !== s.lastTemplateId);
    if (notLast.length) cands = notLast;
  }
  const [a, b] = s.styleHistory.slice(-2);
  if (a && a === b) {
    const other = cands.filter((t) => t.styleName !== a);
    if (other.length) cands = other;
  }
  // 적게 나온 소단원·틀일수록, 약점 유형일수록 잘 뽑히게 한다.
  const weights = cands.map((t) => {
    const w = 1 / (1 + (s.servedBySub[subKey(t)] ?? 0)) / (1 + 0.5 * (s.servedByTemplate[t.id] ?? 0));
    return t.weakness.length ? w * WEAK_BONUS : w;
  });
  let r = s.rng.next() * weights.reduce((x, y) => x + y, 0);
  for (let i = 0; i < cands.length; i++) {
    r -= weights[i];
    if (r <= 0) return cands[i];
  }
  return cands[cands.length - 1];
}

export function nextProblem(s) {
  const t = pickTemplate(s);
  const level = t.levels.includes(s.level) ? s.level : t.levels[t.levels.length - 1];
  const problem = generate(t, level, s.rng, { avoid: new Set(s.recent) });
  s.lastTemplateId = t.id;
  s.styleHistory.push(t.styleName);
  s.servedByTemplate[t.id] = (s.servedByTemplate[t.id] ?? 0) + 1;
  s.servedBySub[subKey(t)] = (s.servedBySub[subKey(t)] ?? 0) + 1;
  s.recent.push(problem.key);
  if (s.recent.length > RECENT_LIMIT) s.recent.splice(0, s.recent.length - RECENT_LIMIT);
  return problem;
}

// 난이도 조절. 바뀌면 'up' 또는 'down'을 돌려준다.
export function adjustLevel(s, correct) {
  if (correct) {
    s.downStreak = 0;
    s.upStreak++;
    if (s.upStreak >= UP_AFTER) {
      s.upStreak = 0;
      if (s.level < MAX_LEVEL) {
        s.level++;
        return 'up';
      }
    }
  } else {
    s.upStreak = 0;
    s.downStreak++;
    if (s.downStreak >= DOWN_AFTER) {
      s.downStreak = 0;
      if (s.level > MIN_LEVEL) {
        s.level--;
        return 'down';
      }
    }
  }
  return null;
}

// 문제를 처음 채점했을 때 한 번만 부른다.
export function recordResult(s, problem, correct, cause = null) {
  s.solved++;
  if (correct) {
    s.correct++;
    s.streak++;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
  } else {
    s.streak = 0;
  }
  s.results.push({ templateId: problem.templateId, unit: problem.unit, sub: problem.sub, styleName: problem.styleName, correct, cause });
  const levelChange = adjustLevel(s, correct);
  return {
    levelChange,
    finished: s.mode === 'set' && s.solved >= SET_SIZE,
    breakTime: s.mode === 'infinite' && s.solved % BREAK_EVERY === 0,
  };
}

// 오늘의 결과 화면용 요약
export function summarize(s) {
  const wrongByTemplate = {};
  for (const r of s.results) if (!r.correct) wrongByTemplate[r.templateId] = (wrongByTemplate[r.templateId] ?? 0) + 1;
  const wrongTypes = Object.entries(wrongByTemplate)
    .sort((a, b) => b[1] - a[1])
    .map(([templateId, count]) => {
      const r = s.results.find((x) => x.templateId === templateId);
      return { templateId, unit: r.unit, sub: r.sub, styleName: r.styleName, count };
    });
  return {
    solved: s.solved,
    correct: s.correct,
    rate: s.solved ? Math.round((s.correct / s.solved) * 100) : 0,
    bestStreak: s.bestStreak,
    level: s.level,
    wrongTypes,
  };
}
