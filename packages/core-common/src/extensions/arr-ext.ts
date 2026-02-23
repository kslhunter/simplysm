/**
 * Array 확장 메서드
 *
 * @remarks 각 메서드의 TSDoc은 타입 정의 파일(arr-ext.types.ts) 참조
 */

import "./map-ext";
import { objClone, objEqual, objMerge } from "../utils/obj";
import type { PrimitiveTypeStr, Type } from "../common.types";
import { DateTime } from "../types/date-time";
import { DateOnly } from "../types/date-only";
import { Time } from "../types/time";
import { Uuid } from "../types/uuid";
import { ArgumentError } from "../errors/argument-error";
import { SdError } from "../errors/sd-error";
import { compareForOrder } from "./arr-ext.helpers";
import type {
  ReadonlyArrayExt,
  MutableArrayExt,
  ArrayDiffsResult,
  ArrayDiffs2Result,
  TreeArray,
} from "./arr-ext.types";

//#region 구현

const arrayReadonlyExtensions: ReadonlyArrayExt<any> & ThisType<any[]> = {
  single<T>(predicate?: (item: T, index: number) => boolean): T | undefined {
    const arr = predicate !== undefined ? this.filter(predicate) : this;
    if (arr.length > 1) {
      throw new ArgumentError("복수의 결과물이 있습니다.", { count: arr.length });
    }
    return arr[0];
  },

  first<T>(predicate?: (item: T, index: number) => boolean): T | undefined {
    return predicate !== undefined ? this.find(predicate) : this[0];
  },

  async filterAsync<T>(predicate: (item: T, index: number) => Promise<boolean>): Promise<T[]> {
    const arr: T[] = [];
    for (let i = 0; i < this.length; i++) {
      if (await predicate(this[i], i)) {
        arr.push(this[i]);
      }
    }
    return arr;
  },

  last<T>(predicate?: (item: T, index: number) => boolean): T | undefined {
    if (predicate !== undefined) {
      for (let i = this.length - 1; i >= 0; i--) {
        if (predicate(this[i], i)) {
          return this[i];
        }
      }

      return undefined;
    } else {
      return this[this.length - 1];
    }
  },

  filterExists<T>(): NonNullable<T>[] {
    return this.filter((item) => item != null);
  },

  ofType<T, N extends T>(type: PrimitiveTypeStr | Type<N>): N[] {
    // PrimitiveTypeStr인 경우
    if (typeof type === "string") {
      return this.filter((item) => {
        switch (type) {
          case "string":
            return typeof item === "string";
          case "number":
            return typeof item === "number";
          case "boolean":
            return typeof item === "boolean";
          case "DateTime":
            return item instanceof DateTime;
          case "DateOnly":
            return item instanceof DateOnly;
          case "Time":
            return item instanceof Time;
          case "Uuid":
            return item instanceof Uuid;
          case "Bytes":
            return item instanceof Uint8Array;
          default: {
            // exhaustive check: PrimitiveTypeStr에 새 타입 추가 시 컴파일 에러 발생
            const _exhaustive: never = type;
            throw new ArgumentError(`지원하지 않는 타입: ${_exhaustive}`);
          }
        }
      }) as N[];
    }

    // Type<N> (생성자)인 경우
    return this.filter((item) => item instanceof type || item?.constructor === type) as N[];
  },

  async mapAsync<T, R>(selector: (item: T, index: number) => Promise<R>): Promise<R[]> {
    const result: R[] = [];
    for (let i = 0; i < this.length; i++) {
      result.push(await selector(this[i], i));
    }
    return result;
  },

  mapMany<T, R>(selector?: (item: T, index: number) => R[]): T | R[] {
    const arr = selector ? this.map(selector) : this;
    return arr.flat().filterExists();
  },

  async mapManyAsync<T, R>(selector?: (item: T, index: number) => Promise<R[]>): Promise<T | R[]> {
    const arr = selector !== undefined ? await this.mapAsync(selector) : this;
    return arr.mapMany();
  },

  parallelAsync<T, R>(fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
    return Promise.all(this.map(fn));
  },

  // 배열을 키별로 그룹화
  // 성능 고려사항:
  // - primitive 키 (string, number 등): O(n) - Map 기반
  // - 객체 키: O(n²) - objEqual 비교
  groupBy<T, K, V>(
    keySelector: (item: T, index: number) => K,
    valueSelector?: (item: T, index: number) => V,
  ): {
    key: K;
    values: (V | T)[];
  }[] {
    const result: { key: K; values: (V | T)[] }[] = [];

    // primitive 키 최적화를 위한 Map (키 문자열 -> result 인덱스)
    const primitiveKeyIndex = new Map<string, number>();

    for (let i = 0; i < this.length; i++) {
      const keyObj = keySelector(this[i], i);
      const valueObj = valueSelector !== undefined ? valueSelector(this[i], i) : this[i];

      // primitive 키는 Map으로 O(n) 처리
      if (keyObj == null || typeof keyObj !== "object") {
        const keyStr = typeof keyObj + ":" + String(keyObj);
        const existingIndex = primitiveKeyIndex.get(keyStr);
        if (existingIndex !== undefined) {
          result[existingIndex].values.push(valueObj);
        } else {
          primitiveKeyIndex.set(keyStr, result.length);
          result.push({ key: keyObj, values: [valueObj] });
        }
        continue;
      }

      // 객체 키는 기존 방식 O(n²)
      const existsRecord = result.find((item) => objEqual(item.key, keyObj));
      if (existsRecord !== undefined) {
        existsRecord.values.push(valueObj);
      } else {
        result.push({ key: keyObj, values: [valueObj] });
      }
    }

    return result;
  },

  toMap<T, K, V>(
    keySelector: (item: T, index: number) => K,
    valueSelector?: (item: T, index: number) => V,
  ): Map<K, V | T> {
    const result = new Map<K, V | T>();

    for (let i = 0; i < this.length; i++) {
      const item = this[i];

      const keyObj = keySelector(item, i);
      const valueObj = valueSelector !== undefined ? valueSelector(item, i) : item;

      if (result.has(keyObj)) {
        throw new ArgumentError("키가 중복되었습니다.", { duplicatedKey: keyObj });
      }
      result.set(keyObj, valueObj);
    }

    return result;
  },

  async toMapAsync<T, K, V>(
    keySelector: (item: T, index: number) => Promise<K> | K,
    valueSelector?: (item: T, index: number) => Promise<V> | V,
  ): Promise<Map<K, V | T>> {
    const result = new Map<K, V | T>();

    for (let i = 0; i < this.length; i++) {
      const item = this[i];

      const keyObj = await keySelector(item, i);
      const valueObj = valueSelector !== undefined ? await valueSelector(item, i) : item;

      if (result.has(keyObj)) {
        throw new ArgumentError("키가 중복되었습니다.", { duplicatedKey: keyObj });
      }
      result.set(keyObj, valueObj);
    }

    return result;
  },

  toArrayMap<T, K, V>(
    keySelector: (item: T, index: number) => K,
    valueSelector?: (item: T, index: number) => V,
  ): Map<K, (V | T)[]> {
    const result = new Map<K, (V | T)[]>();

    for (let i = 0; i < this.length; i++) {
      const item = this[i];

      const keyObj = keySelector(item, i);
      const valueObj = valueSelector !== undefined ? valueSelector(item, i) : item;

      const arr = result.getOrCreate(keyObj, []);
      arr.push(valueObj);
    }

    return result;
  },

  toSetMap<T, K, V>(
    keySelector: (item: T, index: number) => K,
    valueSelector?: (item: T, index: number) => V,
  ): Map<K, Set<V | T>> {
    const result = new Map<K, Set<V | T>>();

    for (let i = 0; i < this.length; i++) {
      const item = this[i];

      const keyObj = keySelector(item, i);
      const valueObj = valueSelector !== undefined ? valueSelector(item, i) : item;

      const set = result.getOrCreate(keyObj, new Set<V | T>());
      set.add(valueObj);
    }

    return result;
  },

  toMapValues<T, K, V>(
    keySelector: (item: T, index: number) => K,
    valueSelector: (items: T[]) => V,
  ): Map<K, V | T> {
    const itemsMap = new Map<K, T[]>();

    for (let i = 0; i < this.length; i++) {
      const item = this[i];

      const keyObj = keySelector(item, i);

      const arr = itemsMap.getOrCreate(keyObj, []);
      arr.push(item);
    }

    const result = new Map<K, V | T>();

    for (const key of itemsMap.keys()) {
      result.set(key, valueSelector(itemsMap.get(key)!));
    }

    return result;
  },

  toObject<T, V>(
    keySelector: (item: T, index: number) => string,
    valueSelector?: (item: T, index: number) => V,
  ): Record<string, V | T> {
    const result: Record<string, V | T> = {};

    for (let i = 0; i < this.length; i++) {
      const item = this[i];

      const key = keySelector(item, i);
      const valueObj = valueSelector !== undefined ? valueSelector(item, i) : item;

      // undefined 값은 "없음"으로 취급하여 덮어쓰기 허용
      if (result[key] !== undefined) {
        throw new ArgumentError("키가 중복되었습니다.", { duplicatedKey: key });
      }
      result[key] = valueObj;
    }

    return result;
  },

  toTree<T, K extends keyof T, P extends keyof T>(key: K, parentKey: P): TreeArray<T>[] {
    // O(n) 최적화: 맵 기반 인덱싱
    const childrenMap = this.toArrayMap((item) => item[parentKey]);

    const fn = (items: T[]): TreeArray<T>[] => {
      return items.map((item) => ({
        ...objClone(item),
        children: fn(childrenMap.get(item[key]) ?? []),
      }));
    };

    const rootItems = this.filter((item1) => item1[parentKey] == null);
    return fn(rootItems);
  },

  distinct<T>(
    options?: boolean | { matchAddress?: boolean; keyFn?: (item: T) => string | number },
  ): T[] {
    // 옵션 정규화
    const opts = typeof options === "boolean" ? { matchAddress: options } : (options ?? {});

    // matchAddress: Set 기반 O(n)
    if (opts.matchAddress === true) return [...new Set(this)];

    // keyFn 제공 시: 커스텀 키 기반 O(n)
    if (opts.keyFn) {
      const seen = new Set<string | number>();
      const result: T[] = [];
      for (const item of this) {
        const key = opts.keyFn(item);
        if (!seen.has(key)) {
          seen.add(key);
          result.push(item);
        }
      }
      return result;
    }

    // 기본: 타입별 처리
    const seen = new Map<string, T>();
    const seenRefs = new Set<symbol | ((...args: unknown[]) => unknown)>(); // symbol/function용 O(n) 처리
    const result: T[] = [];

    for (const item of this) {
      // primitive 타입은 빠른 경로
      if (item === null || typeof item !== "object") {
        const type = typeof item;

        // symbol, function은 Set으로 identity 비교 (O(n))
        if (type === "symbol" || type === "function") {
          if (!seenRefs.has(item)) {
            seenRefs.add(item);
            result.push(item);
          }
          continue;
        }

        // 나머지 primitive는 타입 prefix + 특수 케이스 처리
        let key = type + ":";
        if (Object.is(item, -0)) {
          key += "-0";
        } else {
          key += String(item);
        }

        if (!seen.has(key)) {
          seen.set(key, item);
          result.push(item);
        }
        continue;
      }

      if (!result.some((item1) => objEqual(item1, item))) {
        result.push(item);
      }
    }

    return result;
  },

  orderBy<T>(
    selector?: (item: T) => string | number | DateTime | DateOnly | Time | undefined,
  ): T[] {
    return [...this].sort((p, n) => {
      const pp = selector == null ? p : selector(p);
      const pn = selector == null ? n : selector(n);
      return compareForOrder(pp, pn, false);
    });
  },

  orderByDesc<T>(
    selector?: (item: T) => string | number | DateTime | DateOnly | Time | undefined,
  ): T[] {
    return [...this].sort((p, n) => {
      const pp = selector == null ? p : selector(p);
      const pn = selector == null ? n : selector(n);
      return compareForOrder(pp, pn, true);
    });
  },

  diffs<T, P>(
    target: P[],
    options?: {
      keys?: string[];
      excludes?: string[];
    },
  ): ArrayDiffsResult<T, P>[] {
    const result: ArrayDiffsResult<T, P>[] = [];

    const uncheckedTarget = [...target];
    const uncheckedTargetSet = new Set(uncheckedTarget);
    const hasKeys = options?.keys !== undefined && options.keys.length > 0;
    const excludeOpts = { topLevelExcludes: options?.excludes };

    // keys 옵션이 있는 경우 target을 keys 기준으로 Map에 미리 인덱싱하여 O(n×m) → O(n+m) 개선
    // 키 값이 같은 target이 여러 개 있을 수 있으므로 배열로 저장
    const keyIndexedTarget = hasKeys ? new Map<string, P[]>() : undefined;

    if (keyIndexedTarget) {
      for (const targetItem of uncheckedTarget) {
        const keyStr = JSON.stringify(
          options!.keys!.map((k) => (targetItem as Record<string, unknown>)[k]),
        );
        const arr = keyIndexedTarget.get(keyStr);
        if (arr) {
          arr.push(targetItem);
        } else {
          keyIndexedTarget.set(keyStr, [targetItem]);
        }
      }
    }

    for (const sourceItem of this) {
      // 전체 일치(sameTarget) 우선, 없으면 키 일치(sameKeyTarget) 검색
      let sameTarget: P | undefined;
      let sameKeyTarget: P | undefined;

      // Set 기반 건너뛰기로 이미 매칭된 항목 스킵 (splice O(n) 제거)
      for (const targetItem of uncheckedTarget) {
        if (!uncheckedTargetSet.has(targetItem)) continue;
        if (objEqual(targetItem, sourceItem, excludeOpts)) {
          sameTarget = targetItem;
          break;
        }
      }

      // 전체 일치가 없고 keys 옵션이 있으면 Map에서 O(1) 조회
      if (sameTarget === undefined && keyIndexedTarget) {
        const sourceKeyStr = JSON.stringify(
          options!.keys!.map((k) => (sourceItem as Record<string, unknown>)[k]),
        );
        const candidates = keyIndexedTarget.get(sourceKeyStr);
        if (candidates && candidates.length > 0) {
          // uncheckedTargetSet에서 O(1) 조회로 아직 남아있는 첫 번째 항목 선택
          sameKeyTarget = candidates.find((c) => uncheckedTargetSet.has(c));
        }
      }

      if (sameTarget !== undefined) {
        uncheckedTargetSet.delete(sameTarget);
      } else if (sameKeyTarget !== undefined) {
        result.push({ source: sourceItem, target: sameKeyTarget });
        uncheckedTargetSet.delete(sameKeyTarget);
      } else {
        result.push({ source: sourceItem, target: undefined });
      }
    }

    for (const uncheckedTargetItem of uncheckedTargetSet) {
      result.push({ source: undefined, target: uncheckedTargetItem });
    }

    return result;
  },

  oneWayDiffs<T extends Record<string, unknown>, K extends keyof T>(
    orgItems: T[] | Map<T[K], T>,
    keyPropNameOrGetValFn: K | ((item: T) => string | number | undefined),
    options?: {
      includeSame?: boolean;
      excludes?: string[];
      includes?: string[];
    },
  ): ArrayDiffs2Result<T>[] {
    const orgItemMap =
      orgItems instanceof Map
        ? orgItems
        : orgItems.toMap((orgItem) =>
            typeof keyPropNameOrGetValFn === "function"
              ? keyPropNameOrGetValFn(orgItem)
              : orgItem[keyPropNameOrGetValFn],
          );
    const includeSame = options?.includeSame ?? false;

    const diffs: ArrayDiffs2Result<T>[] = [];
    for (const item of this) {
      const keyValue =
        typeof keyPropNameOrGetValFn === "function"
          ? keyPropNameOrGetValFn(item)
          : item[keyPropNameOrGetValFn];
      if (keyValue == null) {
        diffs.push({ type: "create", item, orgItem: undefined });
        continue;
      }

      const orgItem = orgItemMap.get(keyValue);
      if (!orgItem) {
        diffs.push({ type: "create", item, orgItem: undefined });
        continue;
      }

      if (
        objEqual(orgItem, item, {
          topLevelExcludes: options?.excludes,
          topLevelIncludes: options?.includes,
        })
      ) {
        if (includeSame) {
          diffs.push({ type: "same", item, orgItem });
        }
        continue;
      }

      diffs.push({ type: "update", item, orgItem });
    }
    return diffs;
  },

  merge<T, P>(
    target: P[],
    options?: {
      keys?: string[];
      excludes?: string[];
    },
  ): (T | P | (T & P))[] {
    const diffs = this.diffs(target, options);

    const result: (T | P | (T & P))[] = objClone(this);

    // source 항목의 원본 인덱스를 미리 계산하여 O(n) 검색을 O(1)로 개선
    const sourceIndexMap = new Map<T, number>();
    for (let i = 0; i < this.length; i++) {
      sourceIndexMap.set(this[i], i);
    }

    for (const diff of diffs) {
      // 변경시
      if (diff.source !== undefined && diff.target !== undefined) {
        const sourceIndex = sourceIndexMap.get(diff.source);
        if (sourceIndex === undefined) {
          throw new SdError("예상치 못한 오류: merge에서 source 항목을 찾을 수 없습니다.");
        }
        result[sourceIndex] = objMerge(diff.source, diff.target);
      }
      // 추가시
      else if (diff.target !== undefined) {
        result.push(diff.target);
      }
    }

    return result;
  },

  sum<T>(selector?: (item: T, index: number) => number): number {
    let result = 0;
    for (let i = 0; i < this.length; i++) {
      const item = selector !== undefined ? selector(this[i], i) : this[i];
      if (typeof item !== "number") {
        throw new ArgumentError("sum 은 number 에 대해서만 사용할 수 있습니다.", {
          type: typeof item,
        });
      }
      result += item;
    }

    return result;
  },

  min<T>(selector?: (item: T, index: number) => string | number): string | number | undefined {
    let result: string | number | undefined;
    for (let i = 0; i < this.length; i++) {
      const item = selector !== undefined ? selector(this[i], i) : this[i];
      if (typeof item !== "number" && typeof item !== "string") {
        throw new ArgumentError("min 은 number/string 에 대해서만 사용할 수 있습니다.", {
          type: typeof item,
        });
      }
      if (result === undefined || result > item) {
        result = item;
      }
    }

    return result;
  },

  max<T>(selector?: (item: T, index: number) => string | number): string | number | undefined {
    let result: string | number | undefined;
    for (let i = 0; i < this.length; i++) {
      const item = selector !== undefined ? selector(this[i], i) : this[i];
      if (typeof item !== "number" && typeof item !== "string") {
        throw new ArgumentError("max 은 number/string 에 대해서만 사용할 수 있습니다.", {
          type: typeof item,
        });
      }
      if (result === undefined || result < item) {
        result = item;
      }
    }

    return result;
  },

  shuffle<T>(): T[] {
    if (this.length <= 1) {
      return [...this];
    }

    const result = [...this];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  },
};

const arrayMutableExtensions: MutableArrayExt<any> & ThisType<any[]> = {
  distinctThis<T>(
    options?: boolean | { matchAddress?: boolean; keyFn?: (item: T) => string | number },
  ): T[] {
    // 옵션 정규화
    const opts = typeof options === "boolean" ? { matchAddress: options } : (options ?? {});

    // matchAddress: Set 기반 O(n)
    // 첫 번째 등장한 요소를 유지하기 위해 정방향 순회 후 제거할 인덱스 수집
    if (opts.matchAddress === true) {
      const seen = new Set<T>();
      const toRemove: number[] = [];
      for (let i = 0; i < this.length; i++) {
        if (seen.has(this[i])) {
          toRemove.push(i);
        } else {
          seen.add(this[i]);
        }
      }
      // 역순으로 제거 (인덱스 변화 방지)
      for (let i = toRemove.length - 1; i >= 0; i--) {
        this.splice(toRemove[i], 1);
      }
      return this;
    }

    // keyFn 제공 시: 커스텀 키 기반 O(n)
    // 첫 번째 등장한 요소를 유지하기 위해 정방향 순회 후 제거할 인덱스 수집
    if (opts.keyFn) {
      const seen = new Set<string | number>();
      const toRemove: number[] = [];
      for (let i = 0; i < this.length; i++) {
        const key = opts.keyFn(this[i]);
        if (seen.has(key)) {
          toRemove.push(i);
        } else {
          seen.add(key);
        }
      }
      // 역순으로 제거 (인덱스 변화 방지)
      for (let i = toRemove.length - 1; i >= 0; i--) {
        this.splice(toRemove[i], 1);
      }
      return this;
    }

    // 기본: 타입별 처리 (primitive 최적화)
    const seen = new Map<string, T>();
    const seenRefs = new Set<symbol | ((...args: unknown[]) => unknown)>();
    const toRemoveSet = new Set<number>();

    for (let i = 0; i < this.length; i++) {
      const item = this[i];

      // primitive 타입은 빠른 경로 O(n)
      if (item === null || typeof item !== "object") {
        const type = typeof item;

        // symbol, function은 Set으로 identity 비교
        if (type === "symbol" || type === "function") {
          if (seenRefs.has(item)) {
            toRemoveSet.add(i);
          } else {
            seenRefs.add(item);
          }
          continue;
        }

        // 나머지 primitive는 타입 prefix + 특수 케이스 처리
        let key = type + ":";
        if (Object.is(item, -0)) {
          key += "-0";
        } else {
          key += String(item);
        }

        if (seen.has(key)) {
          toRemoveSet.add(i);
        } else {
          seen.set(key, item);
        }
        continue;
      }

      // 객체는 깊은 비교 O(n²) - 제거되지 않은 이전 항목들과 비교
      let hasDuplicateBefore = false;
      for (let j = 0; j < i; j++) {
        // toRemoveSet에 있는 인덱스는 건너뜀 (O(1) 조회)
        if (toRemoveSet.has(j)) continue;
        if (objEqual(this[j], item)) {
          hasDuplicateBefore = true;
          break;
        }
      }
      if (hasDuplicateBefore) {
        toRemoveSet.add(i);
      }
    }

    // 역순으로 제거 (인덱스 변화 방지)
    const toRemoveArr = Array.from(toRemoveSet).sort((a, b) => b - a);
    for (const idx of toRemoveArr) {
      this.splice(idx, 1);
    }

    return this;
  },

  orderByThis<T>(
    selector?: (item: T) => string | number | DateTime | DateOnly | Time | undefined,
  ): T[] {
    return this.sort((p, n) => {
      const pp = selector?.(p) ?? p;
      const pn = selector?.(n) ?? n;
      return compareForOrder(pp, pn, false);
    });
  },

  orderByDescThis<T>(
    selector?: (item: T) => string | number | DateTime | DateOnly | Time | undefined,
  ): T[] {
    return this.sort((p, n) => {
      const pp = selector?.(p) ?? p;
      const pn = selector?.(n) ?? n;
      return compareForOrder(pp, pn, true);
    });
  },

  insert<T>(index: number, ...items: T[]): T[] {
    this.splice(index, 0, ...items);
    return this;
  },

  remove<T>(itemOrSelector: T | ((item: T, index: number) => boolean)): T[] {
    const shouldRemove =
      typeof itemOrSelector === "function"
        ? (itemOrSelector as (item: T, index: number) => boolean)
        : (item: T) => item === itemOrSelector;

    // 역방향 순회로 인덱스 변경 문제 방지 (O(n) 성능)
    for (let i = this.length - 1; i >= 0; i--) {
      if (shouldRemove(this[i], i)) {
        this.splice(i, 1);
      }
    }

    return this;
  },

  toggle<T>(this: T[], item: T): T[] {
    if (this.includes(item)) {
      this.remove(item);
    } else {
      this.push(item);
    }
    return this;
  },

  clear<T>(this: T[]): T[] {
    return this.remove(() => true);
  },
};

for (const [name, fn] of Object.entries({
  ...arrayReadonlyExtensions,
  ...arrayMutableExtensions,
})) {
  Object.defineProperty(Array.prototype, name, {
    value: fn,
    enumerable: false,
    writable: true,
    configurable: true,
  });
}

//#endregion

//#region 타입 선언

declare global {
  interface ReadonlyArray<T> extends ReadonlyArrayExt<T> {}
  interface Array<T> extends ReadonlyArrayExt<T>, MutableArrayExt<T> {}
}

//#endregion

export type {
  ArrayDiffsResult,
  ArrayDiffs2Result,
  TreeArray,
  ComparableType,
} from "./arr-ext.types";
