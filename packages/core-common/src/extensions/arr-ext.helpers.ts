/**
 * Array 확장 헬퍼 함수
 */

import { DateTime } from "../types/date-time";
import { DateOnly } from "../types/date-only";
import { Time } from "../types/time";
import { ArgumentError } from "../errors/argument-error";
import type { ComparableType } from "./arr-ext.types";

/**
 * DateTime, DateOnly, Time을 비교 가능한 primitive 값으로 변환
 */
export function toComparable(value: ComparableType): string | number | boolean | undefined {
  if (value instanceof DateOnly || value instanceof DateTime || value instanceof Time) {
    return value.tick;
  }
  return value;
}

/**
 * 정렬을 위한 비교 함수
 *
 * @param pp 비교 대상 1
 * @param pn 비교 대상 2
 * @param desc true: 내림차순, false: 오름차순
 * @returns 음수: pp가 앞, 0: 같음, 양수: pn이 앞
 * @note null/undefined 값은 오름차순 시 앞으로, 내림차순 시 뒤로 정렬됨
 */
export function compareForOrder(pp: ComparableType, pn: ComparableType, desc: boolean): number {
  const cpp = toComparable(pp);
  const cpn = toComparable(pn);

  if (cpn === cpp) return 0;
  if (cpp == null) return desc ? 1 : -1;
  if (cpn == null) return desc ? -1 : 1;

  if (typeof cpn === "string" && typeof cpp === "string") {
    return desc ? cpn.localeCompare(cpp) : cpp.localeCompare(cpn);
  }
  if (typeof cpn === "number" && typeof cpp === "number") {
    if (desc) {
      return cpp > cpn ? -1 : cpp < cpn ? 1 : 0;
    }
    return cpp < cpn ? -1 : cpp > cpn ? 1 : 0;
  }
  if (typeof cpn === "boolean" && typeof cpp === "boolean") {
    // true > false: 오름차순 시 true가 뒤, 내림차순 시 true가 앞
    return cpn ? (desc ? 1 : -1) : desc ? -1 : 1;
  }

  throw new ArgumentError("orderBy를 사용할 수 없는 타입입니다.", {
    type1: typeof cpp,
    type2: typeof cpn,
  });
}
