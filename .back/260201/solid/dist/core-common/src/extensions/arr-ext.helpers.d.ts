/**
 * Array 확장 헬퍼 함수
 */
import type { ComparableType } from "./arr-ext.types";
/**
 * DateTime, DateOnly, Time을 비교 가능한 primitive 값으로 변환
 */
export declare function toComparable(value: ComparableType): string | number | boolean | undefined;
/**
 * 정렬을 위한 비교 함수
 *
 * @param pp 비교 대상 1
 * @param pn 비교 대상 2
 * @param desc true: 내림차순, false: 오름차순
 * @returns 음수: pp가 앞, 0: 같음, 양수: pn이 앞
 * @note null/undefined 값은 오름차순 시 앞으로, 내림차순 시 뒤로 정렬됨
 */
export declare function compareForOrder(
  pp: ComparableType,
  pn: ComparableType,
  desc: boolean,
): number;
//# sourceMappingURL=arr-ext.helpers.d.ts.map
