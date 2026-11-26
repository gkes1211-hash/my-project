// 씨앗(seed)이 같으면 같은 순서로 수가 나오는 무작위 생성기.
// 테스트에서 같은 문제를 다시 만들 수 있게 해 준다.

export function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    // min 이상 max 이하 정수
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
    shuffle(arr) {
      const out = [...arr];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    chance(p) {
      return next() < p;
    },
  };
}

export function randomSeed() {
  return (Date.now() ^ Math.floor(Math.random() * 2 ** 32)) >>> 0;
}
