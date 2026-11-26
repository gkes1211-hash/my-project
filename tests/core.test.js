import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Frac, gcd } from '../js/core/fraction.js';
import { Dec } from '../js/core/decimal.js';
import { makeRng } from '../js/core/random.js';
import { josa, ieyo } from '../js/core/words.js';
import { fracChain, formatValue } from '../js/engine/values.js';

test('분수: 항상 기약분수로 저장', () => {
  const f = new Frac(6, 8);
  assert.equal(f.n, 3);
  assert.equal(f.d, 4);
  assert.equal(new Frac(3, -6).toString(), '-1/2');
  assert.equal(gcd(12, 18), 6);
});

test('분수: 사칙연산과 대분수', () => {
  assert.ok(new Frac(1, 3).add(new Frac(1, 6)).eq(new Frac(1, 2)));
  assert.ok(new Frac(3, 4).mul(8).eq(6));
  assert.ok(Frac.mixed(2, 1, 3).eq(new Frac(7, 3)));
  assert.deepEqual(new Frac(7, 3).toMixed(), { whole: 2, num: 1, den: 3 });
  assert.equal(new Frac(1, 3).cmp(new Frac(1, 4)), 1);
  assert.throws(() => new Frac(1, 0));
});

test('소수: 오차 없는 계산', () => {
  assert.ok(Dec.of('0.1').add(Dec.of('0.2')).eq(Dec.of('0.3')));
  assert.ok(Dec.of('0.1').mul(Dec.of('0.2')).eq(Dec.of('0.02')));
  assert.ok(Dec.of('1.5').mul(Dec.int(4)).eq(Dec.int(6)));
  assert.ok(Dec.of('0.50').eq(Dec.of('.5')));
  assert.equal(Dec.of('0.05').toString(), '0.05');
  assert.equal(Dec.of('12.340').toString(), '12.34');
  assert.equal(Dec.parse('abc'), null);
  assert.equal(Dec.parse('.'), null);
});

test('무작위: 씨앗이 같으면 같은 결과', () => {
  const a = makeRng(7);
  const b = makeRng(7);
  for (let i = 0; i < 20; i++) assert.equal(a.int(1, 100), b.int(1, 100));
  const r = makeRng(1);
  for (let i = 0; i < 1000; i++) {
    const v = r.int(3, 5);
    assert.ok(v >= 3 && v <= 5);
  }
});

test('조사', () => {
  assert.equal(josa('감자', '을/를'), '감자를');
  assert.equal(josa('찰흙', '을/를'), '찰흙을');
  assert.equal(josa(3, '을/를'), '3을');
  assert.equal(josa(2, '을/를'), '2를');
  assert.equal(josa(10, '은/는'), '10은');
  assert.equal(ieyo('6봉지'), '6봉지예요');
  assert.equal(ieyo('6병'), '6병이에요');
});

test('약분·대분수 단계', () => {
  assert.deepEqual(fracChain(12, 8), ['[[12/8]]', '[[3/2]]', '[[1 1/2]]']);
  assert.deepEqual(fracChain(6, 3), ['[[6/3]]', '2']);
  assert.deepEqual(fracChain(2, 5), ['[[2/5]]']);
  assert.deepEqual(fracChain(7, 3), ['[[7/3]]', '[[2 1/3]]']);
  assert.equal(formatValue(new Frac(7, 3)), '[[2 1/3]]');
});
