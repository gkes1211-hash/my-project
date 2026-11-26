// 앱 화면: 홈 → 소단원 선택 → 문제 풀기(ui/play.js) → 오늘의 결과
import { UNITS } from './curriculum.js';
import { templatesFor, ALL_TEMPLATES } from './templates/index.js';
import { LEVELS } from './engine/template.js';
import { summarize } from './engine/session.js';
import { createStore } from './store.js';
import { makeRng, randomSeed } from './core/random.js';
import { escapeHtml as esc } from './ui/math.js';
import { initPlay, startPlay, stars, typeName } from './ui/play.js';

const app = document.getElementById('app');
const store = createStore();
const rng = makeRng(randomSeed());

const ui = { mode: 'infinite' }; // 'infinite' | 'set'
let lastScope = null;

const rateText = (r) => (r === null ? '아직 기록 없음' : `정답률 ${r}%`);

function header(title, back) {
  return `<header class="top">
    ${back ? `<button class="back" id="go-back">${esc(back)}</button>` : ''}
    <h1>${esc(title)}</h1>
  </header>`;
}

initPlay({ app, store, rng, header, showResult });

function play(scope) {
  lastScope = scope;
  startPlay(scope, ui.mode);
}

// ── 홈 ──────────────────────────────────────────────

function showHome() {
  const today = store.today();
  const todayRate = today.solved ? Math.round((today.correct / today.solved) * 100) : 0;
  const retry = ALL_TEMPLATES.filter((t) => store.data.retry.includes(t.id));
  app.innerHTML = `
    ${header('5학년 2학기 수학')}
    <main class="wrap">
      <section class="card today">
        <div class="today-nums">
          <div><b>${today.solved}</b><span>오늘 푼 문제</span></div>
          <div><b>${todayRate}%</b><span>오늘 정답률</span></div>
          <div><b>${store.stampCount()}</b><span>받은 도장</span></div>
        </div>
        <div class="mode-toggle" role="radiogroup" aria-label="풀기 방식">
          <button type="button" data-mode="infinite" aria-checked="${ui.mode === 'infinite'}" role="radio">무한 모드</button>
          <button type="button" data-mode="set" aria-checked="${ui.mode === 'set'}" role="radio">10문제</button>
        </div>
        <button class="btn" id="mix-all">전체 단원 섞어서 풀기</button>
      </section>
      ${retry.length ? `
        <button class="unit-card retry-card" id="retry">
          <span class="unit-no">다시</span>
          <span class="unit-name">다음에 다시 도전 ${retry.length}개</span>
          <span class="unit-meta">지난번에 어려웠던 유형을 다시 풀어요</span>
        </button>` : ''}
      ${UNITS.map((u) => {
        const ts = templatesFor(u.no);
        const ready = ts.length > 0;
        return `<button class="unit-card" data-unit="${u.no}" ${ready ? '' : 'disabled'}>
          <span class="unit-no">${u.no}단원</span>
          <span class="unit-name">${esc(u.name)}</span>
          <span class="unit-meta">${ready ? rateText(store.rateFor(ts)) : u.later ? '그림이 많아 나중에 추가돼요' : '준비 중'}</span>
        </button>`;
      }).join('')}
      <p class="note">개발 3단계 시험판 · 1단원 전체, 2단원 일부</p>
    </main>`;
  app.querySelectorAll('[data-mode]').forEach((b) =>
    b.addEventListener('click', () => {
      ui.mode = b.dataset.mode;
      showHome();
    }),
  );
  app.querySelector('#mix-all').addEventListener('click', () => play({ key: 'all', title: '전체 단원 섞기', templates: ALL_TEMPLATES }));
  app.querySelector('#retry')?.addEventListener('click', () => play({ key: 'retry', title: '다음에 다시 도전', templates: retry }));
  app.querySelectorAll('.unit-card[data-unit]:not([disabled])').forEach((b) => b.addEventListener('click', () => showUnit(Number(b.dataset.unit))));
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
  app.querySelector('#mix-unit').addEventListener('click', () => play({ key: `u${u.no}`, title: `${u.no}단원 전체`, templates: templatesFor(u.no) }));
  app.querySelectorAll('.sub:not([disabled])').forEach((b) =>
    b.addEventListener('click', () => {
      const sub = Number(b.dataset.sub);
      play({ key: `u${u.no}-${sub}`, title: u.subs[sub - 1], templates: templatesFor(u.no, sub) });
    }),
  );
  window.scrollTo(0, 0);
}

// ── 오늘의 결과 ───────────────────────────────────────

function showResult(P) {
  const sum = summarize(P.session);
  const list = (items, right) => `<ul class="wrong-list">${items.map((w) => `<li><span>${esc(typeName(w))}</span>${right(w)}</li>`).join('')}</ul>`;
  app.innerHTML = `
    ${header('오늘의 결과')}
    <main class="wrap">
      <section class="card result">
        <div class="today-nums">
          <div><b>${sum.solved}</b><span>푼 문제</span></div>
          <div><b>${sum.rate}%</b><span>정답률</span></div>
          <div><b>${sum.passed.length}</b><span>통과한 유형</span></div>
        </div>
        ${sum.extraSolved ? `<p>비슷한 문제 도전: ${sum.extraSolved}문제 중 ${sum.extraCorrect}문제 정답</p>` : ''}
        <p>최고 연속 정답 ${sum.bestStreak} · 지금 난이도 <span class="stars-view">${stars(sum.level)}</span> ${LEVELS[sum.level]}</p>
        <p class="cheer">${sum.solved === 0 ? '다음에 또 만나요!' : sum.rate >= 80 ? '정말 잘했어요!' : '꾸준히 푸는 것이 제일 중요해요. 수고했어요!'}</p>
      </section>
      ${sum.passed.length ? `<section class="card"><h2 class="card-title">통과 도장을 받은 유형</h2>${list(sum.passed, () => '<b class="mini-stamp">통과</b>')}</section>` : ''}
      ${sum.retry.length ? `<section class="card"><h2 class="card-title">다음에 다시 도전할 유형</h2>${list(sum.retry, () => '<b>다시 도전</b>')}</section>` : ''}
      ${sum.wrongTypes.length ? `<section class="card"><h2 class="card-title">오늘 틀린 유형</h2>${list(sum.wrongTypes, (w) => `<b>${w.count}번</b>`)}</section>` : ''}
      <button class="btn" id="again">같은 범위 다시 풀기</button>
      <button class="btn ghost" id="home">홈으로</button>
    </main>`;
  app.querySelector('#again').addEventListener('click', () => play(lastScope));
  app.querySelector('#home').addEventListener('click', showHome);
  window.scrollTo(0, 0);
}

if (new URLSearchParams(location.search).has('debug')) import('./ui/debug.js');

showHome();
