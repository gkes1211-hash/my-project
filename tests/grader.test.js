import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Frac } from '../js/core/fraction.js';
import { Dec } from '../js/core/decimal.js';
import { grade } from '../js/engine/grader.js';

const fracProblem = (answer) => ({ answerType: 'fraction', answer });
const f = (whole = '', num = '', den = '') => ({ whole, num, den });

test('분수 채점: 정답', () => {
  const p = fracProblem(new Frac(7, 3));
  assert.equal(grade(p, f('2', '1', '3')).result, 'correct');
});

test('분수 채점: 값은 맞지만 표현이 덜 됨', () => {
  const p = fracProblem(new Frac(7, 3));
  const improper = grade(p, f('', '7', '3'));
  assert.equal(improper.result, 'form');
  assert.match(improper.message, /대분수/);
  const notReduced = grade(p, f('2', '2', '6'));
  assert.equal(notReduced.result, 'form');
  assert.match(notReduced.message, /약분/);
  const both = grade(p, f('', '14', '6'));
  assert.match(both.message, /약분.*대분수/);
  assert.equal(grade(p, f('1', '4', '3')).result, 'form');
});

test('분수 채점: 자연수 답', () => {
  const p = fracProblem(new Frac(4));
  assert.equal(grade(p, f('4')).result, 'correct');
  assert.equal(grade(p, f('', '8', '2')).result, 'form');
  assert.equal(grade(p, f('4', '0', '5')).result, 'correct');
});

test('분수 채점: 틀림과 잘못된 입력', () => {
  const p = fracProblem(new Frac(7, 3));
  const wrong = grade(p, f('2', '1', '4'));
  assert.equal(wrong.result, 'wrong');
  assert.ok(wrong.value.eq(new Frac(9, 4)));
  assert.equal(grade(p, f()).result, 'invalid');
  assert.equal(grade(p, f('2', '1', '')).result, 'invalid');
  assert.equal(grade(p, f('', '1', '0')).result, 'invalid');
  assert.equal(grade(p, f('', '1.5', '3')).result, 'invalid');
});

test('소수 채점: 0.50과 0.5는 같다', () => {
  const p = { answerType: 'decimal', answer: Dec.of('0.5') };
  assert.equal(grade(p, '0.50').result, 'correct');
  assert.equal(grade(p, '.5').result, 'correct');
  assert.equal(grade(p, '0.6').result, 'wrong');
  assert.equal(grade(p, '').result, 'invalid');
  assert.equal(grade(p, '0..5').result, 'invalid');
});

test('자연수 채점', () => {
  const p = { answerType: 'natural', answer: 12 };
  assert.equal(grade(p, ' 12 ').result, 'correct');
  assert.equal(grade(p, '13').result, 'wrong');
  assert.equal(grade(p, '12.0').result, 'invalid');
});
