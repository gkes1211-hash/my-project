// 문제 풀기 화면: 무한 모드 / 10문제 + 틀렸을 때 흐름 (기획서 3번의 3~6번)
//
//  main      : 보통 문제. 맞히면 다음 문제, 틀리면 → 원인 고르기 → 진단·개념 → 힌트 받으며 다시 풀기
//              → 다시 맞히면 비슷한 문제 도전(challenge)
//  challenge : 비슷한 문제 5개. 틀려도 바로 답을 보여 주지 않고, 끝난 뒤 함께 다시 본다.
//  review    : 도전에서 틀린 문제를 하나씩 원인 고르기 → 힌트 받으며 다시 풀기
import { UNITS } from '../curriculum.js';
import { ALL_TEMPLATES } from '../templates/index.js';
import { CAUSES, LEVELS } from '../engine/template.js';
import { grade } from '../engine/grader.js';
import { formatValue } from '../engine/values.js';
import { createSession, nextProblem, recordResult, recordExtra, SET_SIZE, BREAK_EVERY } from '../engine/session.js';
import {
  SELF_CHOICES, startRemedy, compareSelfCheck, retryRemedy,
  startChallenge, nextChallengeProblem, recordChallenge, challengeDone, challengeVerdict, nextRound,
  CHALLENGE_SIZE, PASS_MIN,
} from '../engine/remedy.js';
import { renderMath, escapeHtml as esc } from './math.js';
import { renderFigure } from './figure.js';
import { answerInputHtml, wireInputs, readInput } from './inputs.js';

const PRAISE = ['정답이에요! 잘했어요.', '맞았어요! 멋져요.', '정답! 계속 가 볼까요?', '훌륭해요! 정답이에요.', '좋아요! 정확해요.'];
const ALMOST = ['거의 다 왔어요.', '여기만 다시 볼까요?', '조금만 더 생각해 봐요.'];

export const stars = (level) => '★'.repeat(level) + '☆'.repeat(4 - level);
export const subName = (unit, sub) => UNITS.find((u) => u.no === unit).subs[sub - 1];
export const typeName = (x) => `${subName(x.unit, x.sub)} · ${x.styleName}`;

let C; // { app, store, rng, header, showResult }
let P; // 지금 풀고 있는 상태

export function initPlay(ctx) {
  C = ctx;
}

export function getPlay() {
  return P;
}

export function startPlay(scope, mode) {
  P = {
    scope,
    session: createSession({
      templates: scope.templates,
      mode,
      level: C.store.levelFor(scope.key),
      rng: C.rng,
      recent: C.store.data.recent,
    }),
    mode: 'main',
    problem: null,
    graded: false,
    mainOutcome: null,
    remedy: null,
    firstMessage: '',
    challenge: null,
    review: null,
  };
  nextMain();
}

// ── 공통 화면 ─────────────────────────────────────────

const $ = (sel) => C.app.querySelector(sel);

function statusHtml() {
  const s = P.session;
  if (P.mode === 'challenge') {
    const ch = P.challenge;
    const dots = Array.from({ length: CHALLENGE_SIZE }, (_, i) => {
      const r = ch.results[i];
      if (!r) return `<span class="dot${i === ch.results.length ? ' now' : ''}">${i + 1}</span>`;
      return `<span class="dot ${r.correct ? 'ok' : 'no'}">${r.correct ? '○' : '✕'}</span>`;
    }).join('');
    return `<div class="banner challenge">
      <div><b>비슷한 문제 도전${ch.round > 1 ? ` · ${ch.round}회차` : ''}</b><span>${PASS_MIN}개 이상 맞히면 통과 도장!</span></div>
      <div class="dots">${dots}</div>
    </div>`;
  }
  if (P.mode === 'review') {
    return `<div class="banner review"><b>틀린 문제 다시 보기 (${P.review.index + 1}/${P.review.items.length})</b><span>원인을 찾고 다시 맞혀 봐요.</span></div>`;
  }
  const progress = s.mode === 'set' ? `${Math.min(s.solved + 1, SET_SIZE)}/${SET_SIZE}번` : `오늘 ${C.store.today().solved}문제`;
  return `<div class="status">
    <span>${progress} · 연속 ${s.streak} · 통과 ${C.store.today().passed}</span>
    <span class="stars-view" aria-label="난이도 ${LEVELS[s.level]}">${stars(s.level)} <small>${LEVELS[s.level]}</small></span>
  </div>`;
}

function renderScreen({ myAnswer = null } = {}) {
  const p = P.problem;
  C.app.innerHTML = `
    ${C.header(P.scope.title, '그만 풀기')}
    <main class="wrap">
      ${statusHtml()}
      <section class="card">
        <span class="chip">${esc(typeName(p))}</span>
        <div class="question">${renderMath(p.text)}</div>
        ${renderFigure(p.figure)}
        ${myAnswer !== null ? `<p class="my-answer">내가 쓴 답: <b>${renderMath(formatValue(myAnswer))}</b></p>` : ''}
        <div id="help"></div>
        <div id="answer">${answerInputHtml(p)}</div>
        <button class="btn" id="grade">채점하기</button>
      </section>
      <div id="feedback" aria-live="polite"></div>
    </main>`;
  $('#go-back').addEventListener('click', () => C.showResult(P));
  $('#grade').addEventListener('click', onGrade);
  wireInputs($('#answer'), p, onGrade);
  window.scrollTo(0, 0);
}

function setAnswerEnabled(on) {
  $('#answer').querySelectorAll('input, button').forEach((el) => {
    el.disabled = !on;
  });
  $('#grade').hidden = !on;
}

function clearAnswer() {
  $('#answer').innerHTML = answerInputHtml(P.problem);
  wireInputs($('#answer'), P.problem, onGrade);
}

function feedback(html) {
  const box = $('#feedback');
  box.innerHTML = html;
  return box;
}

function onGrade() {
  const p = P.problem;
  const r = grade(p, readInput($('#answer'), p));
  if (r.result === 'invalid') {
    feedback(`<div class="feedback warn"><p>${esc(r.message)}</p></div>`);
    return;
  }
  if (r.result === 'form') {
    feedback(`<div class="feedback warn"><h3>거의 다 왔어요!</h3><p>${esc(r.message)}</p></div>`);
    return;
  }
  if (P.remedy) return onRetry(r);
  if (P.mode === 'challenge') return onChallengeGrade(r);
  return onMainGrade(r);
}

// ── 보통 문제 ─────────────────────────────────────────

function nextMain() {
  P.mode = 'main';
  P.remedy = null;
  P.challenge = null;
  P.review = null;
  P.problem = nextProblem(P.session);
  P.graded = false;
  P.mainOutcome = null;
  C.store.save();
  renderScreen();
}

function onMainGrade(r) {
  const p = P.problem;
  const correct = r.result === 'correct';
  if (!P.graded) {
    P.graded = true;
    const remedy = correct ? null : startRemedy(p, r.value);
    const cause = remedy?.found?.cause ?? null;
    P.mainOutcome = recordResult(P.session, p, correct, cause);
    C.store.recordAttempt({ templateId: p.templateId, correct, cause });
    C.store.setLevel(P.scope.key, P.session.level);
    if (!correct) {
      P.remedy = remedy;
      P.firstFoundId = remedy.found?.id ?? null;
      P.firstMessage = r.message ?? '';
      showSelfCheck();
      return;
    }
  }
  setAnswerEnabled(false);
  const box = feedback(`<div class="feedback good"><h3>${esc(C.rng.pick(PRAISE))}</h3>${levelNote()}</div>${afterMainButtons()}`);
  wireAfterMain(box);
}

function levelNote() {
  const change = P.mainOutcome?.levelChange;
  if (change === 'up') return `<p class="level-up">한 단계 어려운 문제로 올라가요! ${stars(P.session.level)}</p>`;
  if (change === 'down') return `<p class="level-down">조금 쉬운 문제로 연습해 볼까요? ${stars(P.session.level)}</p>`;
  return '';
}

function afterMainButtons() {
  const o = P.mainOutcome;
  if (o?.finished) return `<button class="btn" id="to-result">결과 보기</button>`;
  if (o?.breakTime) {
    return `<div class="feedback rest"><h3>${BREAK_EVERY}문제를 풀었어요!</h3><p>잠깐 쉬어 갈까요? 물 한 잔 마시고 와도 좋아요.</p></div>
      <button class="btn" id="next">계속 풀기</button>
      <button class="btn ghost" id="to-result">그만 풀고 결과 보기</button>`;
  }
  return `<button class="btn" id="next">다음 문제</button>`;
}

function wireAfterMain(box) {
  box.querySelector('#next')?.addEventListener('click', nextMain);
  box.querySelector('#to-result')?.addEventListener('click', () => C.showResult(P));
  box.querySelector('#next, #to-result')?.focus();
}

// 도전·다시 보기가 끝나고 보통 문제로 돌아갈 때
function continueMain() {
  const o = P.mainOutcome;
  if (o?.finished) return C.showResult(P);
  if (o?.breakTime) {
    C.app.querySelector('main').innerHTML = `
      <div class="feedback rest"><h3>${BREAK_EVERY}문제를 풀었어요!</h3><p>잠깐 쉬어 갈까요? 물 한 잔 마시고 와도 좋아요.</p></div>
      <button class="btn" id="next">계속 풀기</button>
      <button class="btn ghost" id="to-result">그만 풀고 결과 보기</button>`;
    wireAfterMain(C.app.querySelector('main'));
    return;
  }
  nextMain();
}

// ── 4. 어디서 틀렸을까? ────────────────────────────────

function showSelfCheck() {
  setAnswerEnabled(false);
  const box = feedback(`
    <div class="feedback warn">
      <h3>${esc(C.rng.pick(ALMOST))} 어디서 틀렸을까요?</h3>
      <p class="small">스스로 먼저 골라 보세요. 정답은 아직 비밀이에요.</p>
      <div class="self-choices">
        ${SELF_CHOICES.map((c) => `<button type="button" class="self-choice" data-key="${c.key}">${esc(c.label)}</button>`).join('')}
      </div>
    </div>`);
  box.querySelectorAll('.self-choice').forEach((b) => b.addEventListener('click', () => onSelfCheck(b.dataset.key)));
}

function onSelfCheck(choice) {
  const rem = P.remedy;
  const check = compareSelfCheck(rem, choice);
  if (check.kind === 'match' || check.kind === 'mismatch') C.store.recordSelfCheck(check.kind === 'match');
  const f = rem.found;
  const box = feedback(`
    <div class="feedback warn">
      <p class="self-result ${check.kind}">${esc(check.message)}</p>
      ${P.firstMessage ? `<p>${esc(P.firstMessage)}</p>` : ''}
      ${f ? `<div class="why"><span class="cause">${CAUSES[f.cause]}</span> ${esc(f.explain)}</div>` : ''}
      ${rem.hintLevel ? hintsHtml(rem) : ''}
      <div class="concept-box"><b>개념 다시 보기</b><p>${renderMath(P.problem.concept)}</p></div>
    </div>
    <button class="btn" id="retry">다시 풀어 보기</button>`);
  box.querySelector('#retry').addEventListener('click', beginRetry);
  box.querySelector('#retry').focus();
}

function hintsHtml(rem) {
  const items = P.problem.hints
    .slice(0, rem.hintLevel)
    .map((h, i) => `<li><span class="hint-no">${i + 1}단계 힌트</span>${renderMath(h)}</li>`)
    .join('');
  return `<ol class="hints">${items}</ol>`;
}

// ── 5. 힌트 받으며 다시 풀기 ──────────────────────────────

function beginRetry() {
  feedback('');
  updateHelp();
  clearAnswer();
  setAnswerEnabled(true);
  $('#answer input, #answer .choice')?.focus();
}

function updateHelp() {
  const rem = P.remedy;
  const parts = [];
  if (rem.hintLevel) parts.push(hintsHtml(rem));
  if (rem.showSolution) {
    parts.push(`<div class="solution-box"><b>풀이를 같이 봐요</b>
      <div class="solution">${P.problem.solution.map(renderMath).join('<br>')}</div>
      <p>정답: <b>${renderMath(formatValue(P.problem.answer))}</b></p>
      <p class="small">풀이를 보면서 답을 직접 써 보세요.</p></div>`);
  }
  parts.push(`<details class="concept-more"><summary>개념 설명 보기</summary><p>${renderMath(P.problem.concept)}</p></details>`);
  $('#help').innerHTML = `<div class="help">${parts.join('')}</div>`;
}

function onRetry(r) {
  const rem = P.remedy;
  const out = retryRemedy(rem, r);
  if (out.status === 'correct') {
    setAnswerEnabled(false);
    P.remedy = null;
    if (P.mode === 'review') {
      const last = P.review.index >= P.review.items.length - 1;
      const box = feedback(`<div class="feedback good"><h3>다시 맞혔어요! 잘했어요.</h3></div>
        <button class="btn" id="go-on">${last ? '다 봤어요' : '다음 틀린 문제'}</button>`);
      box.querySelector('#go-on').addEventListener('click', nextReviewItem);
      return;
    }
    const box = feedback(`<div class="feedback good"><h3>다시 맞혔어요! 잘했어요.</h3>
      <p>이제 비슷한 문제 ${CHALLENGE_SIZE}개로 확실히 익혀 볼까요? ${PASS_MIN}개 이상 맞히면 통과 도장을 받아요.</p></div>
      <button class="btn" id="start-challenge">비슷한 문제 ${CHALLENGE_SIZE}개 도전</button>`);
    box.querySelector('#start-challenge').addEventListener('click', beginChallenge);
    box.querySelector('#start-challenge').focus();
    return;
  }
  updateHelp();
  const f = out.found;
  feedback(`<div class="feedback warn">
    <h3>${esc(C.rng.pick(ALMOST))}</h3>
    ${out.message ? `<p>${esc(out.message)}</p>` : ''}
    ${f ? `<div class="why"><span class="cause">${CAUSES[f.cause]}</span> ${esc(f.explain)}</div>` : ''}
    <p>${out.showSolution ? '위에 풀이를 펼쳐 두었어요. 보면서 다시 써 보세요.' : `위에 ${out.hintLevel}단계 힌트가 새로 나왔어요.`}</p>
  </div>`);
  $('#help').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── 6. 비슷한 문제 도전 ──────────────────────────────────

function beginChallenge() {
  const base = ALL_TEMPLATES.find((t) => t.id === P.problem.templateId);
  P.challenge = startChallenge({
    base,
    mistakeId: P.firstFoundId, // 처음 틀린 답의 오답 패턴 → 같은 패턴을 가진 틀도 섞는다
    allTemplates: ALL_TEMPLATES,
    level: P.problem.level,
  });
  P.challengeBase = { templateId: base.id, unit: base.unit, sub: base.sub, styleName: base.styleName };
  nextChallenge();
}

function nextChallenge() {
  P.mode = 'challenge';
  P.remedy = null;
  P.problem = nextChallengeProblem(P.challenge, C.rng, P.session.recent);
  P.graded = false;
  C.store.save();
  renderScreen();
}

function onChallengeGrade(r) {
  if (P.graded) return;
  P.graded = true;
  const p = P.problem;
  const correct = r.result === 'correct';
  recordChallenge(P.challenge, correct, r.value);
  recordExtra(P.session, p, correct);
  C.store.recordAttempt({ templateId: p.templateId, correct });
  setAnswerEnabled(false);
  const done = challengeDone(P.challenge);
  C.app.querySelector('.banner').outerHTML = statusHtml();
  const box = feedback(`
    <div class="feedback ${correct ? 'good' : 'warn'}">
      <h3>${correct ? esc(C.rng.pick(PRAISE)) : '아쉬워요. 이 문제는 끝나고 같이 다시 볼게요.'}</h3>
    </div>
    <button class="btn" id="go-on">${done ? '결과 보기' : '다음 문제'}</button>`);
  box.querySelector('#go-on').addEventListener('click', done ? showVerdict : nextChallenge);
  box.querySelector('#go-on').focus();
}

function showVerdict() {
  const v = challengeVerdict(P.challenge);
  const name = esc(typeName(P.challengeBase));
  const main = C.app.querySelector('main');
  if (v.passed) {
    C.store.recordPass(P.challengeBase.templateId);
    P.session.passed.push(P.challengeBase);
    main.innerHTML = `
      <section class="card verdict">
        <div class="stamp" aria-hidden="true"><span>통과</span></div>
        <h2>이 유형 통과!</h2>
        <p class="type-name">${name}</p>
        <p>비슷한 문제 ${CHALLENGE_SIZE}개 중 <b>${v.correct}개</b>를 맞혔어요.</p>
        <p class="small">받은 도장은 모두 ${C.store.stampCount()}개예요.</p>
      </section>
      <button class="btn" id="go-on">계속 풀기</button>`;
    main.querySelector('#go-on').addEventListener('click', continueMain);
    return;
  }
  main.innerHTML = `
    <section class="card verdict">
      <h2>${v.correct}개 맞혔어요</h2>
      <p class="type-name">${name}</p>
      <p>${
        v.canRetry
          ? `틀린 문제 ${v.wrong.length}개를 같이 다시 보고, 비슷한 문제에 한 번 더 도전해요.`
          : `틀린 문제 ${v.wrong.length}개를 같이 다시 보고, 이 유형은 ‘다음에 다시 도전’에 넣어 둘게요.`
      }</p>
    </section>
    <button class="btn" id="go-on">틀린 문제 다시 보기</button>`;
  main.querySelector('#go-on').addEventListener('click', () => beginReview(v.wrong, v.canRetry));
}

function beginReview(items, canRetry) {
  P.review = { items, index: -1, canRetry };
  nextReviewItem();
}

function nextReviewItem() {
  const rv = P.review;
  rv.index++;
  if (rv.index >= rv.items.length) return afterReview();
  const item = rv.items[rv.index];
  P.mode = 'review';
  P.problem = item.problem;
  P.remedy = startRemedy(item.problem, item.value);
  P.firstMessage = '';
  renderScreen({ myAnswer: item.value });
  showSelfCheck();
}

function afterReview() {
  if (P.review.canRetry) {
    nextRound(P.challenge);
    P.review = null;
    nextChallenge();
    return;
  }
  C.store.addRetry(P.challengeBase.templateId);
  P.session.retry.push(P.challengeBase);
  C.app.querySelector('main').innerHTML = `
    <section class="card verdict">
      <h2>오늘은 여기까지!</h2>
      <p class="type-name">${esc(typeName(P.challengeBase))}</p>
      <p>이 유형은 ‘다음에 다시 도전’ 목록에 넣어 두었어요. 홈에서 언제든 다시 풀 수 있어요. 틀린 까닭을 알았으니 다음엔 더 잘할 거예요!</p>
    </section>
    <button class="btn" id="go-on">계속 풀기</button>`;
  C.app.querySelector('#go-on').addEventListener('click', continueMain);
}
