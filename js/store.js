// 학습 기록을 기기(localStorage)에 저장한다. (기획서 15번)
// 저장이 막혀 있는 환경(사생활 보호 모드 등)에서도 앱은 그대로 동작하고, 기록만 남지 않는다.

const KEY = 'math52:v1';

function emptyData() {
  return {
    version: 1,
    stats: {}, // 문제 틀별 { tries, correct }
    daily: {}, // 'YYYY-MM-DD' → { solved, correct }
    causes: {}, // 틀린 원인별 횟수
    recent: [], // 최근에 낸 문제 key (최대 50개)
    levels: {}, // 범위(전체/단원/소단원)별 마지막 난이도
    stamps: {}, // 문제 틀별 받은 통과 도장 수
    retry: [], // "다음에 다시 도전" 문제 틀 id
    selfCheck: { total: 0, match: 0 }, // "어디서 틀렸을까" 고른 것이 맞은 횟수
  };
}

export function todayKey(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function createStore(storage = defaultStorage()) {
  let data = emptyData();
  try {
    const raw = storage?.getItem(KEY);
    if (raw) data = { ...emptyData(), ...JSON.parse(raw) };
  } catch {
    data = emptyData();
  }

  function save() {
    try {
      storage?.setItem(KEY, JSON.stringify(data));
    } catch {
      // 저장 공간이 막혀 있으면 조용히 넘어간다.
    }
  }

  return {
    get data() {
      return data;
    },
    save,
    recordAttempt({ templateId, correct, cause = null, date = new Date() }) {
      const s = (data.stats[templateId] ??= { tries: 0, correct: 0 });
      s.tries++;
      if (correct) s.correct++;
      const d = (data.daily[todayKey(date)] ??= { solved: 0, correct: 0, passed: 0 });
      d.solved++;
      if (correct) d.correct++;
      if (!correct && cause) data.causes[cause] = (data.causes[cause] ?? 0) + 1;
      save();
    },
    today(date = new Date()) {
      return { solved: 0, correct: 0, passed: 0, ...data.daily[todayKey(date)] };
    },
    // 비슷한 문제 도전 통과: 도장 + 다시 도전 목록에서 빼기
    recordPass(templateId, date = new Date()) {
      data.stamps[templateId] = (data.stamps[templateId] ?? 0) + 1;
      data.retry = data.retry.filter((id) => id !== templateId);
      const d = (data.daily[todayKey(date)] ??= { solved: 0, correct: 0, passed: 0 });
      d.passed = (d.passed ?? 0) + 1;
      save();
    },
    addRetry(templateId) {
      if (!data.retry.includes(templateId)) data.retry.push(templateId);
      save();
    },
    stampCount() {
      return Object.values(data.stamps).reduce((a, b) => a + b, 0);
    },
    recordSelfCheck(match) {
      data.selfCheck.total++;
      if (match) data.selfCheck.match++;
      save();
    },
    // 문제 틀 목록에 대한 정답률 (기록이 없으면 null)
    rateFor(templates) {
      let tries = 0;
      let correct = 0;
      for (const t of templates) {
        const s = data.stats[t.id];
        if (s) {
          tries += s.tries;
          correct += s.correct;
        }
      }
      return tries ? Math.round((correct / tries) * 100) : null;
    },
    levelFor(scope) {
      return data.levels[scope] ?? 1;
    },
    setLevel(scope, level) {
      data.levels[scope] = level;
      save();
    },
    exportText() {
      return JSON.stringify(data);
    },
  };
}
