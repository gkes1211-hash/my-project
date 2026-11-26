// 모든 문제 틀에 대해 난이도마다 문제 1000개를 만들어 검사한다. (기획서 9번)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_TEMPLATES } from '../js/templates/index.js';
import { generate } from '../js/engine/template.js';
import { sameValue, isPositive } from '../js/engine/values.js';
import { diagnose } from '../js/engine/diagnose.js';
import { renderMath } from '../js/ui/math.js';
import { Frac } from '../js/core/fraction.js';
import { makeRng } from '../js/core/random.js';

const COUNT = 1000;
const MAX_DEN = 12; // 5학년 수준: 답의 분모
const MAX_WHOLE = 200;

function assertCleanText(s, where) {
  assert.equal(typeof s, 'string', `${where}: 글자가 아니에요`);
  assert.ok(s.trim().length > 0, `${where}: 비어 있어요`);
  assert.doesNotMatch(s, /undefined|NaN|null|\[object/, `${where}: 이상한 값 → ${s}`);
  assert.doesNotMatch(renderMath(s), /\[\[|\]\]/, `${where}: 분수 표시가 깨졌어요 → ${s}`);
}

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
        const where = `${t.id} #${i} ${JSON.stringify(p.params)}`;

        // 정답이 조건을 만족하는지 (다른 방법으로 다시 계산)
        assert.ok(t.verify(p.params, p.answer), `${where}: 정답 확인 실패`);

        // 5학년 수준
        assert.ok(isPositive(p.answer), `${where}: 답이 양수가 아니에요`);
        if (p.answer instanceof Frac) {
          assert.ok(p.answer.d <= MAX_DEN, `${where}: 분모가 너무 커요 ${p.answer}`);
          assert.ok(p.answer.n / p.answer.d <= MAX_WHOLE, `${where}: 답이 너무 커요 ${p.answer}`);
        }

        // 오답 패턴 값은 정답과 다르고, 서로도 달라야 원인을 구분할 수 있다.
        for (const [j, m] of p.mistakes.entries()) {
          assert.ok(!sameValue(m.value, p.answer), `${where}: 오답 ${m.id}가 정답과 같아요`);
          assert.equal(diagnose(p, m.value)?.id, m.id, `${where}: 오답 ${m.id}를 찾지 못해요`);
          for (const o of p.mistakes.slice(j + 1)) {
            assert.ok(!sameValue(m.value, o.value), `${where}: 오답 ${m.id}와 ${o.id} 값이 같아요`);
          }
          assertCleanText(m.explain, `${where} 오답 설명 ${m.id}`);
        }
        assert.equal(diagnose(p, p.answer), null);

        // 글자에 깨진 곳이 없는지
        assertCleanText(p.text, `${where} 문제`);
        p.hints.forEach((h, k) => assertCleanText(h, `${where} 힌트${k + 1}`));
        p.solution.forEach((s) => assertCleanText(s, `${where} 풀이`));
        assertCleanText(p.concept, `${where} 개념`);
        texts.add(p.text);
      }
      // 같은 문제만 계속 나오지 않는지
      assert.ok(texts.size >= 30, `${t.id} 난이도${level}: 서로 다른 문제가 ${texts.size}개뿐이에요`);
    });
  }
}
