// 문제 틀(템플릿)의 공통 구조와 문제 만들기.
//
// 문제 틀 하나가 가져야 하는 것 (기획서 2번):
//   id, unit(단원), sub(소단원 번호), style('A' 문제집 형식 / 'B' 다양한 스타일), styleName,
//   levels(난이도 범위, 1 쉬움 ~ 4 도전), answerType(답 형식),
//   weakness(관련 약점 목록, 선택),
//   make(rng, level)  → 숫자·상황 만들기 (params)
//   text(p)           → 문제 문장
//   answer(p)         → 정답 계산
//   verify(p, ans)    → 다른 방법으로 정답을 다시 확인 (자동 테스트용)
//   mistakes[]        → { id, cause, value(p), explain(p) } 자주 하는 오답 패턴
//   hints[3]          → p => 글자  (3단계는 풀이를 따라 풀게 함)
//   concept           → 개념 설명
//   solution(p)       → 풀이 과정 (줄 목록)
//   figure(p)         → 그림 정보 (필요할 때만, 선택)
import { sameValue } from './values.js';

export const CAUSES = {
  concept: '개념 부족',
  calc: '계산 실수',
  condition: '조건 놓침',
  reduce: '약분·표현 미완성',
};

export const LEVELS = { 1: '쉬움', 2: '보통', 3: '어려움', 4: '도전' };

export const ANSWER_TYPES = ['natural', 'fraction', 'decimal'];

const REQUIRED_FUNCS = ['make', 'text', 'answer', 'verify', 'solution'];

export function defineTemplate(t) {
  const where = `문제 틀 ${t.id ?? '(이름 없음)'}`;
  for (const key of ['id', 'unit', 'sub', 'style', 'styleName', 'levels', 'answerType', 'concept']) {
    if (t[key] === undefined) throw new Error(`${where}: ${key}가 없어요`);
  }
  for (const key of REQUIRED_FUNCS) {
    if (typeof t[key] !== 'function') throw new Error(`${where}: ${key} 함수가 없어요`);
  }
  if (!ANSWER_TYPES.includes(t.answerType)) throw new Error(`${where}: 모르는 답 형식 ${t.answerType}`);
  if (!Array.isArray(t.hints) || t.hints.length !== 3) throw new Error(`${where}: 힌트는 3개여야 해요`);
  if (!Array.isArray(t.mistakes) || t.mistakes.length === 0) throw new Error(`${where}: 오답 패턴이 필요해요`);
  for (const m of t.mistakes) {
    if (!m.id || !CAUSES[m.cause] || typeof m.value !== 'function' || typeof m.explain !== 'function') {
      throw new Error(`${where}: 오답 패턴 ${m.id ?? '?'}의 모양이 잘못됐어요`);
    }
  }
  return Object.freeze({ weakness: [], ...t });
}

// 문제 하나를 만든다. 오답 패턴 값이 정답과 같거나 서로 같으면
// 틀린 원인을 구분할 수 없으므로 버리고 다시 만든다.
export function generate(t, level, rng, { maxTries = 200 } = {}) {
  if (!t.levels.includes(level)) throw new Error(`${t.id}: 난이도 ${level}은 지원하지 않아요`);
  for (let tries = 0; tries < maxTries; tries++) {
    const p = t.make(rng, level);
    const answer = t.answer(p);
    if (!t.verify(p, answer)) {
      throw new Error(`${t.id}: 정답 확인 실패 ${JSON.stringify(p)}`);
    }
    const mistakes = t.mistakes.map((m) => ({
      id: m.id,
      cause: m.cause,
      value: m.value(p),
      explain: m.explain(p),
    }));
    const clash = mistakes.some(
      (m, i) => sameValue(m.value, answer) || mistakes.some((o, j) => j > i && sameValue(o.value, m.value)),
    );
    if (clash) continue;
    return {
      templateId: t.id,
      unit: t.unit,
      sub: t.sub,
      style: t.style,
      styleName: t.styleName,
      level,
      answerType: t.answerType,
      params: p,
      text: t.text(p),
      answer,
      mistakes,
      hints: t.hints.map((h) => h(p)),
      concept: t.concept,
      solution: t.solution(p),
      figure: t.figure ? t.figure(p) : null,
    };
  }
  throw new Error(`${t.id}: ${maxTries}번 만들어도 알맞은 문제가 안 나와요`);
}
