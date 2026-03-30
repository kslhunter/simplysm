/**
 * Array 확장 헬퍼 함수
 */

import { DateTime } from "../types/date-time";
import { DateOnly } from "../types/date-only";
import { Time } from "../types/time";
import { ArgumentError } from "../errors/argument-error";
import { equal } from "../utils/obj";
import type { ComparableType } from "./arr-ext.types";

/**
 * DateTime, DateOnly, Time을 비교 가능한 원시 값으로 변환
 */
export function toComparable(value: ComparableType): string | number | boolean | undefined {
  if (value instanceof DateOnly || value instanceof DateTime || value instanceof Time) {
    return value.tick;
  }
  return value;
}

/**
 * 정렬용 비교 함수
 *
 * @param pp 비교 대상 1
 * @param pn 비교 대상 2
 * @param desc true: 내림차순, false: 오름차순
 * @returns 음수: pp가 앞, 0: 같음, 양수: pn이 앞
 * @note null/undefined 값은 오름차순에서 앞, 내림차순에서 뒤로 정렬됨
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
    // true > false: 오름차순에서 true가 뒤, 내림차순에서 true가 앞
    return cpn ? (desc ? 1 : -1) : desc ? -1 : 1;
  }

  throw new ArgumentError("이 타입으로는 orderBy를 사용할 수 없습니다.", {
    type1: typeof cpp,
    type2: typeof cpn,
  });
}

/**
 * 유지할 index의 Set을 반환 (즉, 각 고유 항목의 첫 번째 등장 위치).
 * matchAddress, keyFn, 기본 타입 기반 등 모든 중복 제거 전략을 처리한다.
 */
export function getDistinctIndices<TItem>(
  items: readonly TItem[],
  options?: boolean | { matchAddress?: boolean; keyFn?: (item: TItem) => string | number },
): Set<number> {
  const opts = typeof options === "boolean" ? { matchAddress: options } : (options ?? {});
  const result = new Set<number>();

  // matchAddress: Set 기반 O(n)
  if (opts.matchAddress === true) {
    const seen = new Set<TItem>();
    for (let i = 0; i < items.length; i++) {
      if (!seen.has(items[i])) {
        seen.add(items[i]);
        result.add(i);
      }
    }
    return result;
  }

  // keyFn 제공됨: 커스텀 key 기반 O(n)
  if (opts.keyFn) {
    const seen = new Set<string | number>();
    for (let i = 0; i < items.length; i++) {
      const key = opts.keyFn(items[i]);
      if (!seen.has(key)) {
        seen.add(key);
        result.add(i);
      }
    }
    return result;
  }

  // 기본: 엣지 케이스를 포함한 타입 기반 처리
  const seen = new Map<string, TItem>();
  const seenRefs = new Set<symbol | ((...args: unknown[]) => unknown)>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item === null || typeof item !== "object") {
      const type = typeof item;

      if (type === "symbol" || type === "function") {
        const ref = item as symbol | ((...args: unknown[]) => unknown);
        if (!seenRefs.has(ref)) {
          seenRefs.add(ref);
          result.add(i);
        }
        continue;
      }

      let key = type + ":";
      if (Object.is(item, -0)) {
        key += "-0";
      } else {
        key += String(item);
      }

      if (!seen.has(key)) {
        seen.set(key, item);
        result.add(i);
      }
      continue;
    }

    // 객체: 깊은 비교 (O(n²) — 이미 유지된 항목에서 중복이 없을 때만 추가)
    let hasDuplicate = false;
    for (const keptIdx of result) {
      if (equal(items[keptIdx], item)) {
        hasDuplicate = true;
        break;
      }
    }
    if (!hasDuplicate) {
      result.add(i);
    }
  }

  return result;
}
