// 틀린 답을 오답 패턴과 비교해서 진짜 원인을 찾는다.
import { sameValue } from './values.js';

// 맞는 패턴이 있으면 { id, cause, value, explain }, 없으면 null
export function diagnose(problem, value) {
  return problem.mistakes.find((m) => sameValue(m.value, value)) ?? null;
}
