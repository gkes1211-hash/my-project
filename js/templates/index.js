// 모든 문제 틀을 모은다. 새 단원 파일을 만들면 여기에 한 줄 추가한다.
import unit2 from './unit2.js';

export const ALL_TEMPLATES = [...unit2];

export function templatesFor(unit, sub) {
  return ALL_TEMPLATES.filter((t) => t.unit === unit && t.sub === sub);
}
