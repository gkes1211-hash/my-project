// 모든 문제 틀에 대해 난이도마다 문제 1000개를 만들어 검사한다. (기획서 9번)
//  - 정답이 문제 조건을 실제로 만족하는지 (verify: 다른 방법으로 다시 계산)
//  - 오답 패턴 값이 정답과 같아지지 않는지
//  - 객관식 선택지가 겹치지 않는지
//  - 답이 5학년 수준에 맞는지 (분모 크기, 음수 없음, 너무 큰 수 없음)
//  - 문제·힌트·풀이 글자에 깨진 곳이 없는지
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_TEMPLATES } from '../js/templates/index.js';
import { generate, COMPARE_OPTIONS } from '../js/engine/template.js';
import { sameValue, isPositive } from '../js/engine/values.js';
import { diagnose } from '../js/engine/diagnose.js';
import { renderMath } from '../js/ui/math.js';
import { Frac } from '../js/core/fraction.js';
import { Dec } from '../js/core/decimal.js';
import { makeRng } from '../js/core/random.js';

const COUNT = 1000;
const MAX_DEN = 12; // 답의 분모
const MAX_NUMBER = 1_000_000; // 답으로 나오는 수의 크기
const MAX_DECIMAL_PLACES = 3;

function assertCleanText(s, where) {
  assert.equal(typeof s, 'string', `${where}: 글자가 아니에요`);
  assert.ok(s.trim().length > 0, `${where}: 비어 있어요`);
  assert.doesNotMatch(s, /undefined|NaN|null|\[object|Infinity/, `${where}: 이상한 값 → ${s}`);
  assert.doesNotMatch(renderMath(s), /\[\[|\]\]/, `${where}: 분수 표시가 깨졌어요 → ${s}`);
}

function assertNumberOk(v, where) {
  if (v instanceof Frac) {
    assert.ok(v.n > 0, `${where}: 양수가 아니에요 ${v}`);
    assert.ok(v.d <= MAX_DEN, `${where}: 분모가 너무 커요 ${v}`);
    assert.ok(v.n / v.d <= 200, `${where}: 답이 너무 커요 ${v}`);
    return;
  }
  if (v instanceof Dec) {
    assert.ok(isPositive(v), `${where}: 양수가 아니에요 ${v}`);
    assert.ok(v.scale <= MAX_DECIMAL_PLACES, `${where}: 소수 자리가 너무 길어요 ${v}`);
    return;
  }
  assert.ok(Number.isInteger(v) && v > 0 && v <= MAX_NUMBER, `${where}: 자연수 범위를 벗어났어요 ${v}`);
}

// 답 형식에 맞는 값인지
function assertAnswerShape(p, where) {
  const a = p.answer;
  switch (p.answerType) {
    case 'natural':
    case 'fraction':
    case 'decimal':
      assertNumberOk(a, where);
      break;
    case 'multi':
      assert.ok(Array.isArray(a) && a.length >= 1 && a.length <= 12, `${where}: 여러 개 답의 개수 ${a.length}`);
      assert.equal(new Set(a).size, a.length, `${where}: 여러 개 답에 같은 수가 있어요`);
      a.forEach((x) => assertNumberOk(x, where));
      break;
    case 'minmax':
      assertNumberOk(a.min, where);
      assertNumberOk(a.max, where);
      assert.ok(a.min < a.max, `${where}: 가장 작은 수가 가장 큰 수보다 작아야 해요`);
      break;
    case 'compare':
      assert.ok(COMPARE_OPTIONS.includes(a), `${where}: 부등호가 아니에요 ${a}`);
      break;
    case 'choice':
      assert.ok(p.options.length >= 2, `${where}: 보기가 너무 적어요`);
      assert.equal(new Set(p.options).size, p.options.length, `${where}: 보기가 겹쳐요 ${p.options}`);
      assert.ok(p.options.includes(a), `${where}: 정답이 보기에 없어요`);
      p.options.forEach((o) => assertCleanText(o, `${where} 보기`));
      break;
    default:
      assert.fail(`${where}: 모르는 답 형식 ${p.answerType}`);
  }
}

function assertFigure(f, where) {
  if (!f) return;
  if (f.type === 'numberline') {
    assert.ok(f.max - f.min <= 12 && f.max > f.min, `${where}: 수직선 눈금 범위가 이상해요`);
    for (const end of [f.from, f.to]) {
      if (end) assert.ok(end.v >= f.min && end.v <= f.max, `${where}: 점이 수직선 밖에 있어요`);
    }
    assert.ok(f.from || f.to, `${where}: 수직선에 점이 없어요`);
  } else if (f.type === 'table') {
    assert.ok(f.rows.length >= 2 && f.rows.every((r) => r.length === f.head.length), `${where}: 표 모양이 이상해요`);
  } else if (f.type === 'cards') {
    assert.equal(new Set(f.cards).size, f.cards.length, `${where}: 같은 수 카드가 있어요`);
  } else {
    assert.fail(`${where}: 모르는 그림 ${f.type}`);
  }
}

test('같은 소단원 안에서 유형 이름이 겹치지 않는다 (결과 화면에서 구분되게)', () => {
  const names = ALL_TEMPLATES.map((t) => `${t.unit}-${t.sub}-${t.styleName}`);
  assert.equal(new Set(names).size, names.length, names.filter((n, i) => names.indexOf(n) !== i).join(', '));
});

test('문제 틀 id가 겹치지 않는다', () => {
  const ids = ALL_TEMPLATES.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
});

for (const t of ALL_TEMPLATES) {
  for (const level of t.levels) {
    test(`${t.id} 난이도${level}: 문제 ${COUNT}개 검사`, () => {
      const rng = makeRng(1000 * level + t.id.length);
      const texts = new Set();
      for (let i = 0; i < COUNT; i++) {
        const p = generate(t, level, rng);
        const where = `${t.id} 난이도${level} #${i} ${JSON.stringify(p.params)}`;

        assert.ok(t.verify(p.params, p.answer), `${where}: 정답 확인 실패`);
        assertAnswerShape(p, where);
        assertFigure(p.figure, where);

        // 오답 패턴: 정답과 다르고, 서로 다르고, 진단으로 다시 찾을 수 있어야 한다.
        for (const [j, m] of p.mistakes.entries()) {
          assert.ok(!sameValue(m.value, p.answer), `${where}: 오답 ${m.id}가 정답과 같아요`);
          assert.equal(diagnose(p, m.value)?.id, m.id, `${where}: 오답 ${m.id}를 진단하지 못해요`);
          for (const o of p.mistakes.slice(j + 1)) {
            assert.ok(!sameValue(m.value, o.value), `${where}: 오답 ${m.id}와 ${o.id} 값이 같아요`);
          }
          if (p.options) assert.ok(p.options.includes(m.value), `${where}: 오답 ${m.id}가 보기에 없어요`);
          assertCleanText(m.explain, `${where} 오답 설명 ${m.id}`);
        }
        assert.equal(diagnose(p, p.answer), null);

        assertCleanText(p.text, `${where} 문제`);
        p.hints.forEach((h, k) => assertCleanText(h, `${where} 힌트${k + 1}`));
        p.solution.forEach((s) => assertCleanText(s, `${where} 풀이`));
        assertCleanText(p.concept, `${where} 개념`);
        texts.add(p.key);
      }
      assert.ok(texts.size >= 30, `${t.id} 난이도${level}: 서로 다른 문제가 ${texts.size}개뿐이에요`);
    });
  }
}

test('소단원마다 문제 틀이 4개 이상 있다 (1단원)', () => {
  for (let sub = 1; sub <= 7; sub++) {
    const n = ALL_TEMPLATES.filter((t) => t.unit === 1 && t.sub === sub).length;
    assert.ok(n >= 4, `1단원 소단원 ${sub}: 틀 ${n}개`);
  }
});
