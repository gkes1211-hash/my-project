// 앱 화면: 홈 → 소단원 선택 → 문제 풀기(무한 모드 / 10문제) → 오늘의 결과
// 틀렸을 때의 전체 흐름(원인 고르기 → 힌트 단계 → 비슷한 문제 5개)은 다음 단계에서 만든다.
import { UNITS } from './curriculum.js';
import { templatesFor, ALL_TEMPLATES } from './templates/index.js';
import { CAUSES, LEVELS } from './engine/template.js';
import { grade } from './engine/grader.js';
import { diagnose } from './engine/diagnose.js';
import { formatValue } from './engine/values.js';
import { createSession, nextProblem, recordResult, summarize, SET_SIZE, BREAK_EVERY } from './engine/session.js';
import { createStore } from './store.js';
import { makeRng, randomSeed } from './core/random.js';
import { renderMath, escapeHtml as esc } from './ui/math.js';
import { renderFigure } from './ui/figure.js';
import { answerInputHtml, wireInputs, readInput } from './ui/inputs.js';

const app = document.getElementById('app');
const store = createStore();
const rng = makeRng(randomSeed());

const ui = {
  mode: 'infinite', // 'infinite' | 'set'
  session: null,
  scope: null, // { key, title, unit, sub }
  problem: null,
  graded: false,
  lastOutcome: null, // recordResult 결과
};

const PRAISE = ['정답이에요! 잘했어요.', '맞았어요! 멋져요.', '정답! 계속 가 볼까요?', '훌륭해요! 정답이에요.', '좋아요! 정확해요.'];
const stars = (level) => '★'.repeat(level) + '☆'.repeat(4 - level);
const subName = (unit, sub) => UNITS.find((u) => u.no === unit).subs[sub - 1];
const rateText = (r) => (r === null ? '아직 기록 없음' : `정답률 ${r}%`);

function header(title, back) {
  return `<header class="top">
    ${back ? `<button class="back" id="go-back">${esc(back)}</button>` : ''}
    <h1>${esc(title)}</h1>
  </header>`;
}

// ── 홈 ──────────────────────────────────────────────

function showHome() {
  const today = store.today();
  const todayRate = today.solved ? Math.round((today.correct / today.solved) * 100) : 0;
  app.innerHTML = `
    ${header('5학년 2학기 수학')}
    <main class="wrap">
      <section class="card today">
        <div class="today-nums">
          <div><b>${today.solved}</b><span>오늘 푼 문제</span></div>
          <div><b>${todayRate}%</b><span>오늘 정답률</span></div>
        </div>
        <div class="mode-toggle" role="radiogroup" aria-label="풀기 방식">
          <button type="button" data-mode="infinite" aria-checked="${ui.mode === 'infinite'}" role="radio">무한 모드</button>
          <button type="button" data-mode="set" aria-checked="${ui.mode === 'set'}" role="radio">10문제</button>
        </div>
        <button class="btn" id="mix-all">전체 단원 섞어서 풀기</button>
      </section>
      ${UNITS.map((u) => {
        const ts = templatesFor(u.no);
        const ready = ts.length > 0;
        return `<button class="unit-card" data-unit="${u.no}" ${ready ? '' : 'disabled'}>
          <span class="unit-no">${u.no}단원</span>
          <span class="unit-name">${esc(u.name)}</span>
          <span class="unit-meta">${ready ? rateText(store.rateFor(ts)) : u.later ? '그림이 많아 나중에 추가돼요' : '준비 중'}</span>
        </button>`;
      }).join('')}
      <p class="note">개발 2단계 시험판 · 1단원 전체, 2단원 일부</p>
    </main>`;
  app.querySelectorAll('[data-mode]').forEach((b) =>
    b.addEventListener('click', () => {
      ui.mode = b.dataset.mode;
      showHome();
    }),
  );
  app.querySelector('#mix-all').addEventListener('click', () => startPlay({ key: 'all', title: '전체 단원 섞기', templates: ALL_TEMPLATES }));
  app.querySelectorAll('.unit-card:not([disabled])').forEach((b) => b.addEventListener('click', () => showUnit(Number(b.dataset.unit))));
  window.scrollTo(0, 0);
}

// ── 소단원 선택 ──────────────────────────────────────

function showUnit(unitNo) {
  const u = UNITS.find((x) => x.no === unitNo);
  app.innerHTML = `
    ${header(`${u.no}. ${u.name}`, '← 홈')}
    <main class="wrap">
      <button class="btn" id="mix-unit">이 단원 전체 섞어서 풀기</button>
      <div class="subs">
        ${u.subs.map((s, i) => {
          const ts = templatesFor(u.no, i + 1);
          return `<button class="sub" data-sub="${i + 1}" ${ts.length ? '' : 'disabled'}>
            <span>${esc(s)}</span>
            <small>${ts.length ? rateText(store.rateFor(ts)) : '준비 중'}</small>
          </button>`;
        }).join('')}
      </div>
    </main>`;
  app.querySelector('#go-back').addEventListener('click', showHome);
  app.querySelector('#mix-unit').addEventListener('click', () =>
    startPlay({ key: `u${u.no}`, title: `${u.no}단원 전체`, templates: templatesFor(u.no) }),
  );
  app.querySelectorAll('.sub:not([disabled])').forEach((b) =>
    b.addEventListener('click', () => {
      const sub = Number(b.dataset.sub);
      startPlay({ key: `u${u.no}-${sub}`, title: u.subs[sub - 1], templates: templatesFor(u.no, sub) });
    }),
  );
  window.scrollTo(0, 0);
}

// ── 문제 풀기 ─────────────────────────────────────────

function startPlay(scope) {
  ui.scope = scope;
  ui.session = createSession({
    templates: scope.templates,
    mode: ui.mode,
    level: store.levelFor(scope.key),
    rng,
    recent: store.data.recent,
  });
  showProblem();
}

function showProblem() {
  ui.problem = nextProblem(ui.session);
  ui.graded = false;
  ui.lastOutcome = null;
  store.save(); // 최근 문제 목록 저장
  renderPlay();
  window.scrollTo(0, 0);
}

function renderPlay() {
  const s = ui.session;
  const p = ui.problem;
  const progress = s.mode === 'set' ? `${Math.min(s.solved + 1, SET_SIZE)} / ${SET_SIZE}번` : `${s.solved + 1}번째 문제`;
  app.innerHTML = `
    ${header(ui.scope.title, '그만 풀기')}
    <main class="wrap">
      <div class="status">
        <span>${progress} · 연속 정답 ${s.streak}</span>
        <span class="stars-view" aria-label="난이도 ${LEVELS[s.level]}">${stars(s.level)} <small>${LEVELS[s.level]}</small></span>
      </div>
      <section class="card">
        <span class="chip">${esc(subName(p.unit, p.sub))} · ${esc(p.styleName)}</span>
        <div class="question">${renderMath(p.text)}</div>
        ${renderFigure(p.figure)}
        <div id="answer">${answerInputHtml(p)}</div>
        <button class="btn" id="grade">채점하기</button>
      </section>
      <div id="feedback" aria-live="polite"></div>
    </main>`;
  app.querySelector('#go-back').addEventListener('click', showResult);
  app.querySelector('#grade').addEventListener('click', onGrade);
  wireInputs(app.querySelector('#answer'), p, onGrade);
}

function onGrade() {
  const p = ui.problem;
  const r = grade(p, readInput(app.querySelector('#answer'), p));
  const box = app.querySelector('#feedback');

  if (r.result === 'invalid') {
    box.innerHTML = `<div class="feedback warn"><p>${esc(r.message)}</p></div>`;
    return;
  }
  if (r.result === 'form') {
    box.innerHTML = `<div class="feedback warn"><h3>거의 다 왔어요!</h3><p>${esc(r.message)}</p></div>`;
    return;
  }

  const correct = r.result === 'correct';
  const found = correct ? null : diagnose(p, r.value);
  if (!ui.graded) {
    ui.graded = true;
    ui.lastOutcome = recordResult(ui.session, p, correct, found?.cause ?? null);
    store.recordAttempt({ templateId: p.templateId, correct, cause: found?.cause ?? null });
    store.setLevel(ui.scope.key, ui.session.level);
  }

  if (correct) {
    box.innerHTML = `<div class="feedback good"><h3>${esc(rng.pick(PRAISE))}</h3>${levelNote()}</div>${nextButtons()}`;
    wireNext(box);
    return;
  }

  const why = found
    ? `<p><span class="cause">${CAUSES[found.cause]}</span>${esc(found.explain)}</p>`
    : `${r.message ? `<p>${esc(r.message)}</p>` : ''}<p>어디서 다른지 같이 찾아볼까요?</p><p class="hint">💡 ${renderMath(p.hints[0])}</p>`;
  box.innerHTML = `
    <div class="feedback warn">
      <h3>여기만 다시 볼까요?</h3>
      ${found && r.message ? `<p>${esc(r.message)}</p>` : ''}
      ${why}
      <p class="small">답을 고쳐서 다시 채점해 볼 수 있어요.</p>
      ${levelNote()}
    </div>
    <button class="btn ghost" id="show-solution">정답과 풀이 보기</button>
    <div id="solution"></div>`;
  box.querySelector('#show-solution').addEventListener('click', () => {
    box.querySelector('#solution').innerHTML = `
      <div class="feedback warn">
        <p><b>정답:</b> ${renderMath(formatValue(p.answer))}</p>
        <div class="solution">${p.solution.map(renderMath).join('<br>')}</div>
        <p class="concept"><b>개념</b><br>${renderMath(p.concept)}</p>
      </div>
      ${nextButtons()}`;
    box.querySelector('#show-solution').remove();
    wireNext(box);
  });
}

function levelNote() {
  const change = ui.lastOutcome?.levelChange;
  if (change === 'up') return `<p class="level-up">한 단계 어려운 문제로 올라가요! ${stars(ui.session.level)}</p>`;
  if (change === 'down') return `<p class="level-down">조금 쉬운 문제로 연습해 볼까요? ${stars(ui.session.level)}</p>`;
  return '';
}

function nextButtons() {
  const o = ui.lastOutcome;
  if (o?.finished) return `<button class="btn" id="to-result">결과 보기</button>`;
  if (o?.breakTime) {
    return `<div class="feedback rest"><h3>${BREAK_EVERY}문제를 풀었어요!</h3><p>잠깐 쉬어 갈까요? 물 한 잔 마시고 와도 좋아요.</p></div>
      <button class="btn" id="next">계속 풀기</button>
      <button class="btn ghost" id="to-result">그만 풀고 결과 보기</button>`;
  }
  return `<button class="btn" id="next">다음 문제</button>`;
}

function wireNext(box) {
  box.querySelector('#next')?.addEventListener('click', showProblem);
  box.querySelector('#to-result')?.addEventListener('click', showResult);
  box.querySelector('#next, #to-result')?.focus();
}

// ── 오늘의 결과 ───────────────────────────────────────

function showResult() {
  const sum = summarize(ui.session);
  app.innerHTML = `
    ${header('오늘의 결과')}
    <main class="wrap">
      <section class="card result">
        <div class="today-nums">
          <div><b>${sum.solved}</b><span>푼 문제</span></div>
          <div><b>${sum.rate}%</b><span>정답률</span></div>
          <div><b>${sum.bestStreak}</b><span>최고 연속 정답</span></div>
        </div>
        <p>지금 난이도: <span class="stars-view">${stars(sum.level)}</span> ${LEVELS[sum.level]}</p>
        <p class="cheer">${sum.solved === 0 ? '다음에 또 만나요!' : sum.rate >= 80 ? '정말 잘했어요!' : '꾸준히 푸는 것이 제일 중요해요. 수고했어요!'}</p>
      </section>
      ${sum.wrongTypes.length ? `
        <section class="card">
          <h2 class="card-title">다시 도전할 유형</h2>
          <ul class="wrong-list">
            ${sum.wrongTypes.map((w) => `<li><span>${esc(subName(w.unit, w.sub))} · ${esc(w.styleName)}</span><b>${w.count}번 틀림</b></li>`).join('')}
          </ul>
        </section>` : ''}
      <button class="btn" id="again">같은 범위 다시 풀기</button>
      <button class="btn ghost" id="home">홈으로</button>
    </main>`;
  app.querySelector('#again').addEventListener('click', () => startPlay(ui.scope));
  app.querySelector('#home').addEventListener('click', showHome);
  window.scrollTo(0, 0);
}

showHome();
