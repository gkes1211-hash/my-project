// 소수 계산기: 소수를 "정수 ÷ 10의 거듭제곱"으로 저장해서 0.1 + 0.2 같은 오차가 없다.
import { Frac } from './fraction.js';

export class Dec {
  // units / 10^scale  예) 0.25 → units 25, scale 2
  constructor(units, scale = 0) {
    if (!Number.isSafeInteger(units) || !Number.isInteger(scale) || scale < 0) {
      throw new Error(`잘못된 소수예요: ${units}, ${scale}`);
    }
    while (scale > 0 && units % 10 === 0) {
      units /= 10;
      scale -= 1;
    }
    this.units = units;
    this.scale = scale;
    Object.freeze(this);
  }

  // "0.50", ".5", "3", "12.340" 을 읽는다. 읽을 수 없으면 null.
  static parse(str) {
    const m = /^\s*(-)?(\d*)(?:\.(\d+))?\s*$/.exec(String(str));
    if (!m || (m[2] === '' && m[3] === undefined)) return null;
    const intPart = m[2] || '0';
    const fracPart = m[3] || '';
    const units = Number(intPart + fracPart) * (m[1] ? -1 : 1);
    if (!Number.isSafeInteger(units)) return null;
    return new Dec(units, fracPart.length);
  }

  static of(str) {
    const d = Dec.parse(str);
    if (!d) throw new Error(`소수로 읽을 수 없어요: ${str}`);
    return d;
  }

  static int(n) {
    return new Dec(n, 0);
  }

  #align(o) {
    const s = Math.max(this.scale, o.scale);
    return [this.units * 10 ** (s - this.scale), o.units * 10 ** (s - o.scale), s];
  }

  add(o) {
    const [a, b, s] = this.#align(o);
    return new Dec(a + b, s);
  }

  sub(o) {
    const [a, b, s] = this.#align(o);
    return new Dec(a - b, s);
  }

  mul(o) {
    return new Dec(this.units * o.units, this.scale + o.scale);
  }

  eq(o) {
    return this.units === o.units && this.scale === o.scale;
  }

  cmp(o) {
    const [a, b] = this.#align(o);
    return Math.sign(a - b);
  }

  toFrac() {
    return new Frac(this.units, 10 ** this.scale);
  }

  toString() {
    const neg = this.units < 0;
    const digits = String(Math.abs(this.units)).padStart(this.scale + 1, '0');
    const cut = digits.length - this.scale;
    const s = this.scale ? `${digits.slice(0, cut)}.${digits.slice(cut)}` : digits;
    return neg ? `-${s}` : s;
  }
}
