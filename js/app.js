// 앱 화면 (1단계: 홈 + 문제 풀기 + 채점)
// 틀렸을 때의 전체 흐름(원인 고르기, 힌트 단계, 비슷한 문제 5개)은 2단계에서 만든다.
import { UNITS } from './curriculum.js';
import { templatesFor } from './templates/index.js';
import { generate, CAUSES, LEVELS } from './engine/template.js';
import { grade } from './engine/grader.js';
import { diagnose } from './engine/diagnose.js';
import { formatValue } from './engine/values.js';
import { makeRng, randomSeed } from './core/random.js';
import { renderMath, escapeHtml as esc } from './ui/math.js';

const app = document.getElementById('app');

const state = {
  screen: 'home',
  unit: null,
  sub: null,
  level: 1,
  problem: null,
  lastTemplateId: null,
  graded: false, // 이 문제를 이미 한 번 채점했는지 (점수는 첫 채점만 센다)
  solved: 0,
  correct: 0,
  streak: 0,
  rng: makeRng(randomSeed()),
};

const PRAISE = ['정답이에요! 잘했어요.', '맞았어요! 멋져요.', '정답! 계속 가 볼까요?', '훌륭해요! 정답이에요.'];

// ── 홈 ──────────────────────────────────────────────

function renderHome() {
  app.innerHTML = `
    <header class="top"><h1>5학년 2학기 수학</h1></header>
    <main class="wrap">
      ${UNITS.map(
        (u) => `
        <section class="unit">
          <h2>${u.no}. ${esc(u.name)}</h2>
          ${u.later ? '<p class="muted">그림이 많은 단원이라 나중에 추가돼요.</p>' : ''}
          <div class="subs">
            ${u.subs
              .map((s, i) => {
                const ready = templatesFor(u.no, i + 1).length > 0;
                return `<button class="sub" data-unit="${u.no}" data-sub="${i + 1}" ${ready ? '' : 'disabled'}>
                  ${esc(s)}${ready ? '' : '<small>준비 중</small>'}</button>`;
              })
              .join('')}
          </div>
        </section>`,
      ).join('')}
      <p class="note">개발 1단계 시험판이에요.</p>
    </main>`;
  app.querySelectorAll('.sub:not([disabled])').forEach((btn) =>
    btn.addEventListener('click', () => {
      state.unit = Number(btn.dataset.unit);
      state.sub = Number(btn.dataset.sub);
      state.screen = 'problem';
      nextProblem();
    }),
  );
}

// ── 문제 풀기 ─────────────────────────────────────────

function nextProblem() {
  const list = templatesFor(state.unit, state.sub).filter((t) => t.levels.includes(state.level));
  // 같은 틀이 연달아 나오지 않게
  const choices = list.length > 1 ? list.filter((t) => t.id !== state.lastTemplateId) : list;
  const t = state.rng.pick(choices);
  state.lastTemplateId = t.id;
  state.problem = generate(t, state.level, state.rng);
  state.graded = false;
  renderProblem();
  window.scrollTo(0, 0);
}

function answerInputHtml(type) {
  if (type === 'fraction') {
    return `
      <div class="answer-row">
        <input id="in-whole" inputmode="numeric" pattern="[0-9]*" autocomplete="off" aria-label="자연수 부분">
        <div class="frac-in">
          <input id="in-num" inputmode="numeric" pattern="[0-9]*" autocomplete="off" aria-label="분자">
          <div class="bar"></div>
          <input id="in-den" inputmode="numeric" pattern="[0-9]*" autocomplete="off" aria-label="분모">
        </div>
      </div>
      <p class="input-help">자연수 부분이 없으면 왼쪽 칸은 비워 두세요.</p>`;
  }
  if (type === 'decimal') {
    return `<div class="answer-row"><input id="in-one" class="wide" inputmode="decimal" autocomplete="off" aria-label="답"></div>`;
  }
  return `<div class="answer-row"><input id="in-one" class="wide" inputmode="numeric" pattern="[0-9]*" autocomplete="off" aria-label="답"></div>`;
}

function readInput(type) {
  const val = (id) => app.querySelector(`#${id}`)?.value ?? '';
  if (type === 'fraction') return { whole: val('in-whole'), num: val('in-num'), den: val('in-den') };
  return val('in-one');
}

function renderProblem() {
  const p = state.problem;
  const subName = UNITS.find((u) => u.no === state.unit).subs[state.sub - 1];
  const rate = state.solved ? Math.round((state.correct / state.solved) * 100) : 0;
  app.innerHTML = `
    <header class="top">
      <button class="back" id="go-home">← 홈</button>
      <h1>${esc(subName)}</h1>
    </header>
    <main class="wrap">
      <div class="status">
        <span>푼 문제 ${state.solved} · 정답률 ${rate}% · 연속 ${state.streak}</span>
        <span class="stars" aria-label="난이도">
          ${[1, 2, 3, 4]
            .map((l) => `<button data-level="${l}" class="${l <= state.level ? 'on' : ''}" aria-label="${LEVELS[l]}">★</button>`)
            .join('')}
        </span>
      </div>
      <section class="card">
        <span class="chip">${esc(p.styleName)} · ${LEVELS[p.level]}</span>
        <div class="question">${renderMath(p.text)}</div>
        ${answerInputHtml(p.answerType)}
        <button class="btn" id="grade">채점하기</button>
      </section>
      <div id="feedback"></div>
      <p class="note">별을 누르면 난이도를 바꿀 수 있어요. (지금은 시험용, 6단계에서 자동 조절)</p>
    </main>`;

  app.querySelector('#go-home').addEventListener('click', () => {
    state.screen = 'home';
    renderHome();
  });
  app.querySelectorAll('.stars button').forEach((b) =>
    b.addEventListener('click', () => {
      state.level = Number(b.dataset.level);
      nextProblem();
    }),
  );
  app.querySelector('#grade').addEventListener('click', onGrade);
  app.querySelectorAll('.answer-row input').forEach((inp) =>
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') onGrade();
    }),
  );
}

function onGrade() {
  const p = state.problem;
  const r = grade(p, readInput(p.answerType));
  const box = app.querySelector('#feedback');

  if (r.result === 'invalid') {
    box.innerHTML = `<div class="feedback warn"><p>${esc(r.message)}</p></div>`;
    return;
  }
  if (r.result === 'form') {
    box.innerHTML = `<div class="feedback warn"><h3>거의 다 왔어요!</h3><p>${esc(r.message)}</p></div>`;
    return;
  }

  const first = !state.graded;
  state.graded = true;

  if (r.result === 'correct') {
    if (first) {
      state.solved++;
      state.correct++;
      state.streak++;
    }
    box.innerHTML = `
      <div class="feedback good">
        <h3>${esc(state.rng.pick(PRAISE))}</h3>
      </div>
      <button class="btn" id="next">다음 문제</button>`;
    box.querySelector('#next').addEventListener('click', nextProblem);
    box.querySelector('#next').focus();
    return;
  }

  // 틀림
  if (first) {
    state.solved++;
    state.streak = 0;
  }
  const found = diagnose(p, r.value);
  const why = found
    ? `<p><span class="cause">${CAUSES[found.cause]}</span>${esc(found.explain)}</p>`
    : `<p>어디서 다른지 같이 찾아볼까요?</p><p>💡 ${renderMath(p.hints[0])}</p>`;
  box.innerHTML = `
    <div class="feedback warn">
      <h3>여기만 다시 볼까요?</h3>
      ${why}
    </div>
    <button class="btn ghost" id="show-solution">정답과 풀이 보기</button>
    <div id="solution"></div>`;
  box.querySelector('#show-solution').addEventListener('click', () => {
    box.querySelector('#solution').innerHTML = `
      <div class="feedback warn">
        <p><b>정답:</b> ${renderMath(formatValue(p.answer))}</p>
        <div class="solution">${p.solution.map(renderMath).join('<br>')}</div>
        <p style="margin-top:12px"><b>개념:</b> ${renderMath(p.concept)}</p>
      </div>
      <button class="btn" id="next">다음 문제</button>`;
    box.querySelector('#next').addEventListener('click', nextProblem);
  });
}

renderHome();
