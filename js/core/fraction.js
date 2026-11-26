// 분수 계산기: 분자·분모를 정수로만 다뤄서 오차가 생기지 않는다.

export function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b);
}

function checkInt(x, what) {
  if (!Number.isSafeInteger(x)) throw new Error(`${what}는 안전한 정수여야 해요: ${x}`);
}

// 항상 기약분수로 저장한다. (분모는 양수)
export class Frac {
  constructor(n, d = 1) {
    checkInt(n, '분자');
    checkInt(d, '분모');
    if (d === 0) throw new Error('분모는 0이 될 수 없어요');
    if (d < 0) {
      n = -n;
      d = -d;
    }
    const g = gcd(n, d) || 1;
    this.n = n / g;
    this.d = d / g;
    Object.freeze(this);
  }

  static of(n, d = 1) {
    return new Frac(n, d);
  }

  // 대분수 w n/d (모두 0 이상)
  static mixed(w, n, d) {
    return new Frac(w * d + n, d);
  }

  add(o) {
    o = toFrac(o);
    return new Frac(this.n * o.d + o.n * this.d, this.d * o.d);
  }

  sub(o) {
    o = toFrac(o);
    return new Frac(this.n * o.d - o.n * this.d, this.d * o.d);
  }

  mul(o) {
    o = toFrac(o);
    return new Frac(this.n * o.n, this.d * o.d);
  }

  div(o) {
    o = toFrac(o);
    return new Frac(this.n * o.d, this.d * o.n);
  }

  eq(o) {
    o = toFrac(o);
    return this.n === o.n && this.d === o.d;
  }

  cmp(o) {
    o = toFrac(o);
    return Math.sign(this.n * o.d - o.n * this.d);
  }

  isInt() {
    return this.d === 1;
  }

  // 0 이상인 분수를 대분수 부분으로 나눈다.
  toMixed() {
    if (this.n < 0) throw new Error('음수는 대분수로 나타내지 않아요');
    return { whole: Math.floor(this.n / this.d), num: this.n % this.d, den: this.d };
  }

  toString() {
    if (this.d === 1) return String(this.n);
    if (this.n > this.d) {
      const m = this.toMixed();
      return `${m.whole} ${m.num}/${m.den}`;
    }
    return `${this.n}/${this.d}`;
  }
}

export function toFrac(x) {
  if (x instanceof Frac) return x;
  if (Number.isInteger(x)) return new Frac(x, 1);
  throw new Error(`분수로 바꿀 수 없는 값이에요: ${x}`);
}
