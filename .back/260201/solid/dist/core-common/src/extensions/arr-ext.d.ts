/**
 * Array 확장 메서드
 *
 * @remarks 각 메서드의 TSDoc은 타입 정의 파일(arr-ext.types.ts) 참조
 */
import "./map-ext";
import type { ReadonlyArrayExt, MutableArrayExt } from "./arr-ext.types";
declare global {
  interface ReadonlyArray<T> extends ReadonlyArrayExt<T> {}
  interface Array<T> extends ReadonlyArrayExt<T>, MutableArrayExt<T> {}
}
export type {
  ArrayDiffsResult,
  ArrayDiffs2Result,
  TreeArray,
  ComparableType,
} from "./arr-ext.types";
//# sourceMappingURL=arr-ext.d.ts.map
