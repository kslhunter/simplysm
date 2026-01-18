/**
 * Array 확장 헬퍼 함수
 */

import { DateTime } from "../types/date-time";
import { DateOnly } from "../types/date-only";
import { Time } from "../types/time";
import { ArgumentError } from "../errors/argument-error";
import type { ComparableType } from "./array-ext.types";

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
    return desc ? (cpn < cpp ? -1 : cpn > cpp ? 1 : 0) : cpn > cpp ? -1 : cpn < cpp ? 1 : 0;
  }
  if (typeof cpn === "boolean" && typeof cpp === "boolean") {
    return cpn === cpp ? 0 : cpn ? (desc ? 1 : -1) : desc ? -1 : 1;
  }

  throw new ArgumentError("orderBy를 사용할 수 없는 타입입니다.", { type1: typeof cpp, type2: typeof cpn });
}
