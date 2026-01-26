/**
 * Remeda에 없는 배열 유틸리티 함수
 *
 * @remarks
 * - Remeda로 대체 가능한 기능: filter, first, last, uniq, sortBy, sumBy, minBy, maxBy, flatMap, groupBy
 * - 이 모듈은 Remeda에 없는 고유 기능만 제공
 * - purry 패턴으로 data-first/data-last 모두 지원
 * - pipeAsync로 비동기 파이프라인 지원
 */

import { ArgumentError } from "../errors/argument-error";
import { SdError } from "../errors/sd-error";
import { objClone, objEqual, objMerge } from "./obj";

//#region pipeAsync

//#endregion

//#region 타입

/** 배열 비교 결과 (INSERT/DELETE/UPDATE) */
export type ArrayDiffsResult<T, P> =
  | { source: undefined; target: P } // INSERT
  | { source: T; target: undefined } // DELETE
  | { source: T; target: P }; // UPDATE

/** 단방향 비교 결과 */
export type ArrayDiffs2Result<T> =
  | { type: "create"; item: T; orgItem: undefined }
  | { type: "update"; item: T; orgItem: T }
  | { type: "same"; item: T; orgItem: T };

/** 트리 구조 타입 */
export type TreeArray<T> = T & { children: TreeArray<T>[] };

//#endregion

//#region 단일 요소 조회

/**
 * 조건에 맞는 단일 요소 반환
 *
 * @param arr 대상 배열
 * @param predicate 필터 조건 (생략 시 배열 전체 대상)
 * @returns 요소가 없으면 undefined
 * @throws ArgumentError 조건에 맞는 요소가 2개 이상이면 발생
 *
 * @example
 * ```typescript
 * // data-first
 * single([1, 2, 3], x => x === 2); // => 2
 * single([1, 2, 2], x => x === 2); // throws ArgumentError
 * single([1, 2, 3], x => x === 4); // => undefined
 *
 * // data-last (pipe 호환)
 * pipe([1, 2, 3], single(x => x === 2)); // => 2
 * ```
 */
export function arrSingle<T>(
  arr: readonly T[],
  predicate?: (item: T, index: number) => boolean,
): T | undefined;
export function arrSingle<T>(
  predicate?: (item: T, index: number) => boolean,
): (arr: readonly T[]) => T | undefined;
export function arrSingle<T>(
  arrOrPredicate?: readonly T[] | ((item: T, index: number) => boolean),
  predicate?: (item: T, index: number) => boolean,
): T | undefined | ((arr: readonly T[]) => T | undefined) {
  // data-last: 첫 번째 인자가 함수이거나 없음 -> 배열이 아닌 경우
  if (arrOrPredicate === undefined || typeof arrOrPredicate === "function") {
    const pred = arrOrPredicate as ((item: T, index: number) => boolean) | undefined;
    return (arr: readonly T[]) => arrSingleImpl(arr, pred);
  }
  // data-first: 첫 번째 인자가 배열
  return arrSingleImpl(arrOrPredicate, predicate);
}

function arrSingleImpl<T>(
  arr: readonly T[],
  predicate?: (item: T, index: number) => boolean,
): T | undefined {
  const filtered = predicate !== undefined ? arr.filter(predicate) : arr;
  if (filtered.length > 1) {
    throw new ArgumentError("조건에 맞는 요소가 2개 이상입니다.", { count: filtered.length });
  }
  return filtered[0];
}

//#endregion

//#region 비동기

/**
 * 비동기 병렬 처리 (Promise.all 사용)
 *
 * @param arr 대상 배열
 * @param fn 변환 함수
 * @returns Promise<R[]>
 * @note 하나라도 reject되면 전체가 fail-fast로 reject됨 (Promise.all 동작)
 *
 * @example
 * ```typescript
 * // data-first
 * await parallelAsync([1, 2, 3], async x => x * 2); // => [2, 4, 6]
 *
 * // data-last (pipeAsync 호환)
 * await pipeAsync([1, 2, 3], parallelAsync(async x => x * 2)); // => [2, 4, 6]
 * ```
 */
export function arrParallelAsync<T, R>(
  arr: readonly T[],
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]>;
export function arrParallelAsync<T, R>(
  fn: (item: T, index: number) => Promise<R>,
): (arr: readonly T[]) => Promise<R[]>;
export function arrParallelAsync<T, R>(
  arrOrFn: readonly T[] | ((item: T, index: number) => Promise<R>),
  fn?: (item: T, index: number) => Promise<R>,
): Promise<R[]> | ((arr: readonly T[]) => Promise<R[]>) {
  if (typeof arrOrFn === "function") {
    // data-last
    return (arr: readonly T[]) => Promise.all(arr.map(arrOrFn));
  }
  // data-first
  return Promise.all(arrOrFn.map(fn!));
}

/**
 * 비동기 순차 매핑
 *
 * @param arr 대상 배열
 * @param fn 변환 함수
 * @returns Promise<R[]>
 *
 * @example
 * ```typescript
 * // data-first
 * await mapAsync([1, 2, 3], async x => x * 2); // => [2, 4, 6]
 *
 * // data-last (pipeAsync 호환)
 * await pipeAsync([1, 2, 3], mapAsync(async x => x * 2)); // => [2, 4, 6]
 * ```
 */
export function arrMapAsync<T, R>(
  arr: readonly T[],
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]>;
export function arrMapAsync<T, R>(
  fn: (item: T, index: number) => Promise<R>,
): (arr: readonly T[]) => Promise<R[]>;
export function arrMapAsync<T, R>(
  arrOrFn: readonly T[] | ((item: T, index: number) => Promise<R>),
  fn?: (item: T, index: number) => Promise<R>,
): Promise<R[]> | ((arr: readonly T[]) => Promise<R[]>) {
  if (typeof arrOrFn === "function") {
    // data-last
    return (arr: readonly T[]) => arrMapAsyncImpl(arr, arrOrFn);
  }
  // data-first
  return arrMapAsyncImpl(arrOrFn, fn!);
}

async function arrMapAsyncImpl<T, R>(
  arr: readonly T[],
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const result: R[] = [];
  for (let i = 0; i < arr.length; i++) {
    result.push(await fn(arr[i], i));
  }
  return result;
}

/**
 * 비동기 순차 필터링
 *
 * @param arr 대상 배열
 * @param predicate 조건 함수
 * @returns Promise<T[]>
 *
 * @example
 * ```typescript
 * // data-first
 * await filterAsync([1, 2, 3], async x => x > 1); // => [2, 3]
 *
 * // data-last (pipeAsync 호환)
 * await pipeAsync([1, 2, 3], filterAsync(async x => x > 1)); // => [2, 3]
 * ```
 */
export function arrFilterAsync<T>(
  arr: readonly T[],
  predicate: (item: T, index: number) => Promise<boolean>,
): Promise<T[]>;
export function arrFilterAsync<T>(
  predicate: (item: T, index: number) => Promise<boolean>,
): (arr: readonly T[]) => Promise<T[]>;
export function arrFilterAsync<T>(
  arrOrPredicate: readonly T[] | ((item: T, index: number) => Promise<boolean>),
  predicate?: (item: T, index: number) => Promise<boolean>,
): Promise<T[]> | ((arr: readonly T[]) => Promise<T[]>) {
  if (typeof arrOrPredicate === "function") {
    // data-last
    return (arr: readonly T[]) => arrFilterAsyncImpl(arr, arrOrPredicate);
  }
  // data-first
  return arrFilterAsyncImpl(arrOrPredicate, predicate!);
}

async function arrFilterAsyncImpl<T>(
  arr: readonly T[],
  predicate: (item: T, index: number) => Promise<boolean>,
): Promise<T[]> {
  const result: T[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (await predicate(arr[i], i)) {
      result.push(arr[i]);
    }
  }
  return result;
}

//#endregion

//#region Map 변환

/**
 * 배열을 Map으로 변환
 *
 * @param arr 대상 배열
 * @param keySelector 키 선택 함수
 * @param valueSelector 값 선택 함수 (생략 시 요소 자체 사용)
 * @returns Map<K, V>
 * @throws ArgumentError 키가 중복되면 발생
 *
 * @example
 * ```typescript
 * // data-first
 * toMap([{ id: 1, name: "a" }], x => x.id);
 * // => Map { 1 => { id: 1, name: "a" } }
 *
 * toMap([{ id: 1, name: "a" }], x => x.id, x => x.name);
 * // => Map { 1 => "a" }
 *
 * // data-last (pipe 호환)
 * pipe([{ id: 1, name: "a" }], toMap(x => x.id));
 * ```
 */
// data-first 오버로드
export function arrToMap<T, K>(
  arr: readonly T[],
  keySelector: (item: T, index: number) => K,
): Map<K, T>;
export function arrToMap<T, K, V>(
  arr: readonly T[],
  keySelector: (item: T, index: number) => K,
  valueSelector: (item: T, index: number) => V,
): Map<K, V>;
// data-last 오버로드
export function arrToMap<T, K>(
  keySelector: (item: T, index: number) => K,
): (arr: readonly T[]) => Map<K, T>;
export function arrToMap<T, K, V>(
  keySelector: (item: T, index: number) => K,
  valueSelector: (item: T, index: number) => V,
): (arr: readonly T[]) => Map<K, V>;
// 구현
export function arrToMap<T, K, V>(
  arrOrKeySelector: readonly T[] | ((item: T, index: number) => K),
  keySelectorOrValueSelector?: ((item: T, index: number) => K) | ((item: T, index: number) => V),
  valueSelector?: (item: T, index: number) => V,
): Map<K, V | T> | ((arr: readonly T[]) => Map<K, V | T>) {
  if (typeof arrOrKeySelector === "function") {
    // data-last
    const keySelector = arrOrKeySelector;
    const valSelector = keySelectorOrValueSelector as ((item: T, index: number) => V) | undefined;
    return (arr: readonly T[]) => arrToMapImpl(arr, keySelector, valSelector);
  }
  // data-first
  const arr = arrOrKeySelector;
  const keySelector = keySelectorOrValueSelector as (item: T, index: number) => K;
  return arrToMapImpl(arr, keySelector, valueSelector);
}

function arrToMapImpl<T, K, V>(
  arr: readonly T[],
  keySelector: (item: T, index: number) => K,
  valueSelector?: (item: T, index: number) => V,
): Map<K, V | T> {
  const result = new Map<K, V | T>();

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const keyObj = keySelector(item, i);
    const valueObj = valueSelector !== undefined ? valueSelector(item, i) : item;

    if (result.has(keyObj)) {
      throw new ArgumentError("키가 중복되었습니다.", { duplicatedKey: keyObj });
    }
    result.set(keyObj, valueObj);
  }

  return result;
}

/**
 * 비동기 Map 변환
 *
 * @example
 * ```typescript
 * // data-first
 * await toMapAsync(arr, async x => x.id);
 *
 * // data-last (pipeAsync 호환)
 * await pipeAsync(arr, toMapAsync(async x => x.id));
 * ```
 */
// data-first 오버로드
export function arrToMapAsync<T, K>(
  arr: readonly T[],
  keySelector: (item: T, index: number) => Promise<K> | K,
): Promise<Map<K, T>>;
export function arrToMapAsync<T, K, V>(
  arr: readonly T[],
  keySelector: (item: T, index: number) => Promise<K> | K,
  valueSelector: (item: T, index: number) => Promise<V> | V,
): Promise<Map<K, V>>;
// data-last 오버로드
export function arrToMapAsync<T, K>(
  keySelector: (item: T, index: number) => Promise<K> | K,
): (arr: readonly T[]) => Promise<Map<K, T>>;
export function arrToMapAsync<T, K, V>(
  keySelector: (item: T, index: number) => Promise<K> | K,
  valueSelector: (item: T, index: number) => Promise<V> | V,
): (arr: readonly T[]) => Promise<Map<K, V>>;
// 구현
export function arrToMapAsync<T, K, V>(
  arrOrKeySelector: readonly T[] | ((item: T, index: number) => Promise<K> | K),
  keySelectorOrValueSelector?:
    | ((item: T, index: number) => Promise<K> | K)
    | ((item: T, index: number) => Promise<V> | V),
  valueSelector?: (item: T, index: number) => Promise<V> | V,
): Promise<Map<K, V | T>> | ((arr: readonly T[]) => Promise<Map<K, V | T>>) {
  if (typeof arrOrKeySelector === "function") {
    // data-last
    const keySelector = arrOrKeySelector;
    const valSelector = keySelectorOrValueSelector as
      | ((item: T, index: number) => Promise<V> | V)
      | undefined;
    return (arr: readonly T[]) => arrToMapAsyncImpl(arr, keySelector, valSelector);
  }
  // data-first
  const arr = arrOrKeySelector;
  const keySelector = keySelectorOrValueSelector as (item: T, index: number) => Promise<K> | K;
  return arrToMapAsyncImpl(arr, keySelector, valueSelector);
}

async function arrToMapAsyncImpl<T, K, V>(
  arr: readonly T[],
  keySelector: (item: T, index: number) => Promise<K> | K,
  valueSelector?: (item: T, index: number) => Promise<V> | V,
): Promise<Map<K, V | T>> {
  const result = new Map<K, V | T>();

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const keyObj = await keySelector(item, i);
    const valueObj = valueSelector !== undefined ? await valueSelector(item, i) : item;

    if (result.has(keyObj)) {
      throw new ArgumentError("키가 중복되었습니다.", { duplicatedKey: keyObj });
    }
    result.set(keyObj, valueObj);
  }

  return result;
}

/**
 * 배열을 Map<K, T[]>로 변환 (같은 키의 값들을 배열로)
 *
 * @param arr 대상 배열
 * @param keySelector 키 선택 함수
 * @param valueSelector 값 선택 함수 (생략 시 요소 자체 사용)
 * @returns Map<K, (V | T)[]>
 *
 * @example
 * ```typescript
 * // data-first
 * toArrayMap([{ type: "a", v: 1 }, { type: "a", v: 2 }], x => x.type);
 * // => Map { "a" => [{ type: "a", v: 1 }, { type: "a", v: 2 }] }
 *
 * // data-last (pipe 호환)
 * pipe(items, toArrayMap(x => x.type));
 * ```
 */
// data-first 오버로드
export function arrToArrayMap<T, K>(
  arr: readonly T[],
  keySelector: (item: T, index: number) => K,
): Map<K, T[]>;
export function arrToArrayMap<T, K, V>(
  arr: readonly T[],
  keySelector: (item: T, index: number) => K,
  valueSelector: (item: T, index: number) => V,
): Map<K, V[]>;
// data-last 오버로드
export function arrToArrayMap<T, K>(
  keySelector: (item: T, index: number) => K,
): (arr: readonly T[]) => Map<K, T[]>;
export function arrToArrayMap<T, K, V>(
  keySelector: (item: T, index: number) => K,
  valueSelector: (item: T, index: number) => V,
): (arr: readonly T[]) => Map<K, V[]>;
// 구현
export function arrToArrayMap<T, K, V>(
  arrOrKeySelector: readonly T[] | ((item: T, index: number) => K),
  keySelectorOrValueSelector?: ((item: T, index: number) => K) | ((item: T, index: number) => V),
  valueSelector?: (item: T, index: number) => V,
): Map<K, (V | T)[]> | ((arr: readonly T[]) => Map<K, (V | T)[]>) {
  if (typeof arrOrKeySelector === "function") {
    // data-last
    const keySelector = arrOrKeySelector;
    const valSelector = keySelectorOrValueSelector as ((item: T, index: number) => V) | undefined;
    return (arr: readonly T[]) => arrToArrayMapImpl(arr, keySelector, valSelector);
  }
  // data-first
  const arr = arrOrKeySelector;
  const keySelector = keySelectorOrValueSelector as (item: T, index: number) => K;
  return arrToArrayMapImpl(arr, keySelector, valueSelector);
}

function arrToArrayMapImpl<T, K, V>(
  arr: readonly T[],
  keySelector: (item: T, index: number) => K,
  valueSelector?: (item: T, index: number) => V,
): Map<K, (V | T)[]> {
  const result = new Map<K, (V | T)[]>();

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const keyObj = keySelector(item, i);
    const valueObj = valueSelector !== undefined ? valueSelector(item, i) : item;

    let existing = result.get(keyObj);
    if (!existing) {
      existing = [];
      result.set(keyObj, existing);
    }
    existing.push(valueObj);
  }

  return result;
}

/**
 * 배열을 Map<K, Set<T>>로 변환
 *
 * @param arr 대상 배열
 * @param keySelector 키 선택 함수
 * @param valueSelector 값 선택 함수 (생략 시 요소 자체 사용)
 * @returns Map<K, Set<V | T>>
 *
 * @example
 * ```typescript
 * // data-first
 * toSetMap(items, x => x.type);
 *
 * // data-last (pipe 호환)
 * pipe(items, toSetMap(x => x.type));
 * ```
 */
// data-first 오버로드
export function arrToSetMap<T, K>(
  arr: readonly T[],
  keySelector: (item: T, index: number) => K,
): Map<K, Set<T>>;
export function arrToSetMap<T, K, V>(
  arr: readonly T[],
  keySelector: (item: T, index: number) => K,
  valueSelector: (item: T, index: number) => V,
): Map<K, Set<V>>;
// data-last 오버로드
export function arrToSetMap<T, K>(
  keySelector: (item: T, index: number) => K,
): (arr: readonly T[]) => Map<K, Set<T>>;
export function arrToSetMap<T, K, V>(
  keySelector: (item: T, index: number) => K,
  valueSelector: (item: T, index: number) => V,
): (arr: readonly T[]) => Map<K, Set<V>>;
// 구현
export function arrToSetMap<T, K, V>(
  arrOrKeySelector: readonly T[] | ((item: T, index: number) => K),
  keySelectorOrValueSelector?: ((item: T, index: number) => K) | ((item: T, index: number) => V),
  valueSelector?: (item: T, index: number) => V,
): Map<K, Set<V | T>> | ((arr: readonly T[]) => Map<K, Set<V | T>>) {
  if (typeof arrOrKeySelector === "function") {
    // data-last
    const keySelector = arrOrKeySelector;
    const valSelector = keySelectorOrValueSelector as ((item: T, index: number) => V) | undefined;
    return (arr: readonly T[]) => arrToSetMapImpl(arr, keySelector, valSelector);
  }
  // data-first
  const arr = arrOrKeySelector;
  const keySelector = keySelectorOrValueSelector as (item: T, index: number) => K;
  return arrToSetMapImpl(arr, keySelector, valueSelector);
}

function arrToSetMapImpl<T, K, V>(
  arr: readonly T[],
  keySelector: (item: T, index: number) => K,
  valueSelector?: (item: T, index: number) => V,
): Map<K, Set<V | T>> {
  const result = new Map<K, Set<V | T>>();

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const keyObj = keySelector(item, i);
    const valueObj = valueSelector !== undefined ? valueSelector(item, i) : item;

    let existing = result.get(keyObj);
    if (!existing) {
      existing = new Set<V | T>();
      result.set(keyObj, existing);
    }
    existing.add(valueObj);
  }

  return result;
}

/**
 * 그룹화 후 각 그룹에 함수 적용하여 Map 변환
 *
 * @param arr 대상 배열
 * @param keySelector 키 선택 함수
 * @param valueSelector 그룹의 값들을 변환하는 함수
 * @returns Map<K, V>
 *
 * @example
 * ```typescript
 * // data-first
 * toMapValues(
 *   [{ type: "a", v: 1 }, { type: "a", v: 2 }],
 *   x => x.type,
 *   items => items.reduce((sum, x) => sum + x.v, 0)
 * );
 * // => Map { "a" => 3 }
 *
 * // data-last (pipe 호환)
 * pipe(items, toMapValues(x => x.type, items => items.length));
 * ```
 */
// data-first 오버로드
export function arrToMapValues<T, K, V>(
  arr: readonly T[],
  keySelector: (item: T, index: number) => K,
  valueSelector: (items: T[]) => V,
): Map<K, V>;
// data-last 오버로드
export function arrToMapValues<T, K, V>(
  keySelector: (item: T, index: number) => K,
  valueSelector: (items: T[]) => V,
): (arr: readonly T[]) => Map<K, V>;
// 구현
export function arrToMapValues<T, K, V>(
  arrOrKeySelector: readonly T[] | ((item: T, index: number) => K),
  keySelectorOrValueSelector: ((item: T, index: number) => K) | ((items: T[]) => V),
  valueSelector?: (items: T[]) => V,
): Map<K, V> | ((arr: readonly T[]) => Map<K, V>) {
  if (typeof arrOrKeySelector === "function") {
    // data-last
    const keySelector = arrOrKeySelector;
    const valSelector = keySelectorOrValueSelector as (items: T[]) => V;
    return (arr: readonly T[]) => arrToMapValuesImpl(arr, keySelector, valSelector);
  }
  // data-first
  const arr = arrOrKeySelector;
  const keySelector = keySelectorOrValueSelector as (item: T, index: number) => K;
  return arrToMapValuesImpl(arr, keySelector, valueSelector!);
}

function arrToMapValuesImpl<T, K, V>(
  arr: readonly T[],
  keySelector: (item: T, index: number) => K,
  valueSelector: (items: T[]) => V,
): Map<K, V> {
  const itemsMap = arrToArrayMapImpl(arr, keySelector, undefined);
  const result = new Map<K, V>();

  for (const [key, items] of itemsMap) {
    result.set(key, valueSelector(items as T[]));
  }

  return result;
}

//#endregion

//#region 트리 변환

/**
 * 평탄한 배열을 트리 구조로 변환
 *
 * @param arr 대상 배열
 * @param keyProp 각 항목의 고유 키 속성명
 * @param parentKeyProp 부모 항목의 키를 참조하는 속성명
 * @returns 루트 항목들의 배열 (각 항목에 children 속성 추가)
 *
 * @remarks
 * - parentKey 값이 null/undefined인 항목이 루트가 된다
 * - 내부적으로 toArrayMap을 사용하여 O(n) 복잡도로 처리한다
 * - 원본 항목은 복사되어 children 속성이 추가된다
 *
 * @example
 * ```typescript
 * // data-first
 * const items = [
 *   { id: 1, name: "root" },
 *   { id: 2, parentId: 1, name: "child1" },
 *   { id: 3, parentId: 1, name: "child2" },
 * ];
 *
 * toTree(items, "id", "parentId");
 * // => [{ id: 1, name: "root", children: [
 * //   { id: 2, name: "child1", children: [] },
 * //   { id: 3, name: "child2", children: [] }
 * // ]}]
 *
 * // data-last (pipe 호환)
 * pipe(items, toTree("id", "parentId"));
 * ```
 */
// data-first 오버로드
export function arrToTree<T, K extends keyof T, P extends keyof T>(
  arr: readonly T[],
  keyProp: K,
  parentKeyProp: P,
): TreeArray<T>[];
// data-last 오버로드
export function arrToTree<T, K extends keyof T, P extends keyof T>(
  keyProp: K,
  parentKeyProp: P,
): (arr: readonly T[]) => TreeArray<T>[];
// 구현
export function arrToTree<T, K extends keyof T, P extends keyof T>(
  arrOrKeyProp: readonly T[] | K,
  keyPropOrParentKeyProp: K | P,
  parentKeyProp?: P,
): TreeArray<T>[] | ((arr: readonly T[]) => TreeArray<T>[]) {
  if (Array.isArray(arrOrKeyProp)) {
    // data-first
    return arrToTreeImpl(arrOrKeyProp, keyPropOrParentKeyProp as K, parentKeyProp!);
  }
  // data-last
  const keyProp = arrOrKeyProp as K;
  const parentProp = keyPropOrParentKeyProp as P;
  return (arr: readonly T[]) => arrToTreeImpl(arr, keyProp, parentProp);
}

function arrToTreeImpl<T, K extends keyof T, P extends keyof T>(
  arr: readonly T[],
  keyProp: K,
  parentKeyProp: P,
): TreeArray<T>[] {
  // O(n) 최적화: 맵 기반 인덱싱
  const childrenMap = arrToArrayMapImpl(
    arr,
    (item) => item[parentKeyProp] as unknown as T[K],
    undefined,
  );

  const fn = (items: readonly T[]): TreeArray<T>[] => {
    return items.map((item) => ({
      ...objClone(item),
      children: fn((childrenMap.get(item[keyProp]) ?? []) as readonly T[]),
    }));
  };

  const rootItems = arr.filter((item) => item[parentKeyProp] == null);
  return fn(rootItems);
}

//#endregion

//#region 배열 비교

/**
 * 두 배열 비교 (INSERT/DELETE/UPDATE)
 *
 * @param source 원본 배열
 * @param target 비교 대상 배열
 * @param options keys: 키 비교용, excludes: 비교 제외 속성
 * @returns 변경 사항 배열
 * @note target에 중복 키가 있으면 첫 번째 매칭만 사용됨
 *
 * @example
 * ```typescript
 * diffs(
 *   [{ id: 1, name: "a" }, { id: 2, name: "b" }],
 *   [{ id: 1, name: "a" }, { id: 3, name: "c" }],
 *   { keys: ["id"] }
 * );
 * // => [
 * //   { source: { id: 2, name: "b" }, target: undefined },  // DELETE
 * //   { source: undefined, target: { id: 3, name: "c" } }   // INSERT
 * // ]
 * ```
 */
export function arrDiffs<T, P>(
  source: readonly T[],
  target: readonly P[],
  options?: {
    keys?: string[];
    excludes?: string[];
  },
): ArrayDiffsResult<T, P>[] {
  const result: ArrayDiffsResult<T, P>[] = [];
  const uncheckedTarget = [...target];
  const excludeOpts = { excludes: options?.excludes };
  const hasKeys = options?.keys !== undefined;

  // keys 옵션이 있을 때 키 기반 Map 인덱스 구축 (O(m))
  let keyMap: Map<string, P[]> | undefined;
  if (hasKeys) {
    keyMap = new Map();
    for (const targetItem of target) {
      const keyValues: unknown[] = [];
      for (const key of options.keys!) {
        keyValues.push((targetItem as Record<string, unknown>)[key]);
      }
      const keyStr = JSON.stringify(keyValues);
      const existing = keyMap.get(keyStr);
      if (existing) {
        existing.push(targetItem);
      } else {
        keyMap.set(keyStr, [targetItem]);
      }
    }
  }

  for (const sourceItem of source) {
    let sameTarget: P | undefined;
    let sameKeyTarget: P | undefined;

    if (hasKeys && keyMap) {
      // 키 기반 검색 최적화 (O(1))
      const sourceKeyValues: unknown[] = [];
      for (const key of options.keys!) {
        sourceKeyValues.push((sourceItem as Record<string, unknown>)[key]);
      }
      const sourceKeyStr = JSON.stringify(sourceKeyValues);
      const candidates = keyMap.get(sourceKeyStr);

      if (candidates) {
        for (const candidate of candidates) {
          if (!uncheckedTarget.includes(candidate)) continue;

          if (objEqual(candidate, sourceItem, excludeOpts)) {
            sameTarget = candidate;
            break;
          } else if (sameKeyTarget === undefined) {
            sameKeyTarget = candidate;
          }
        }
      }
    } else {
      // keys 옵션이 없으면 전체 순회 (O(m))
      for (const targetItem of uncheckedTarget) {
        if (objEqual(targetItem, sourceItem, excludeOpts)) {
          sameTarget = targetItem;
          break;
        }
      }
    }

    if (sameTarget !== undefined) {
      const idx = uncheckedTarget.indexOf(sameTarget);
      if (idx !== -1) uncheckedTarget.splice(idx, 1);
    } else if (sameKeyTarget !== undefined) {
      result.push({ source: sourceItem, target: sameKeyTarget });
      const idx = uncheckedTarget.indexOf(sameKeyTarget);
      if (idx !== -1) uncheckedTarget.splice(idx, 1);
    } else {
      result.push({ source: sourceItem, target: undefined });
    }
  }

  for (const uncheckedTargetItem of uncheckedTarget) {
    result.push({ source: undefined, target: uncheckedTargetItem });
  }

  return result;
}

/**
 * 단방향 배열 비교 (create/update/same)
 *
 * @param items 현재 배열
 * @param orgItems 원본 배열 또는 Map
 * @param keyPropNameOrFn 키 속성명 또는 키 추출 함수
 * @param options includeSame: same 결과 포함 여부, excludes: 비교 제외 속성, includes: 비교 포함 속성
 * @returns 변경 사항 배열
 */
export function arrOneWayDiffs<T extends object, K extends keyof T>(
  items: readonly T[],
  orgItems: readonly T[] | Map<T[K], T>,
  keyPropNameOrFn: K | ((item: T) => T[K]),
  options?: {
    includeSame?: boolean;
    excludes?: string[];
    includes?: string[];
  },
): ArrayDiffs2Result<T>[] {
  const orgItemMap =
    orgItems instanceof Map
      ? orgItems
      : arrToMap(orgItems, (orgItem) =>
          typeof keyPropNameOrFn === "function"
            ? keyPropNameOrFn(orgItem)
            : orgItem[keyPropNameOrFn],
        );
  const includeSame = options?.includeSame ?? false;

  const result: ArrayDiffs2Result<T>[] = [];
  for (const item of items) {
    const keyValue =
      typeof keyPropNameOrFn === "function" ? keyPropNameOrFn(item) : item[keyPropNameOrFn];
    if (keyValue == null) {
      result.push({ type: "create", item, orgItem: undefined });
      continue;
    }

    const orgItem = orgItemMap.get(keyValue);
    if (!orgItem) {
      result.push({ type: "create", item, orgItem: undefined });
      continue;
    }

    if (
      objEqual(orgItem, item, {
        excludes: options?.excludes,
        includes: options?.includes,
      })
    ) {
      if (includeSame) {
        result.push({ type: "same", item, orgItem });
      }
      continue;
    }

    result.push({ type: "update", item, orgItem });
  }
  return result;
}

/**
 * diffs() 결과 기반 배열 병합
 *
 * @param source 원본 배열
 * @param target 비교 대상 배열
 * @param options keys: 키 비교용, excludes: 비교 제외 속성
 * @returns 병합된 배열
 */
export function arrMerge<T, P>(
  source: readonly T[],
  target: readonly P[],
  options?: {
    keys?: string[];
    excludes?: string[];
  },
): (T | P | (T & P))[] {
  const diffResults = arrDiffs(source, target, options);

  const result: (T | P | (T & P))[] = objClone(source) as T[];

  // source 항목의 원본 인덱스를 미리 계산하여 O(n) 검색을 O(1)로 개선
  const sourceIndexMap = new Map<T, number>();
  for (let i = 0; i < source.length; i++) {
    sourceIndexMap.set(source[i], i);
  }

  for (const diff of diffResults) {
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
}

//#endregion
