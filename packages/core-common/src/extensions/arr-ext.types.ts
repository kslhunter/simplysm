/**
 * Array 확장 타입 정의
 */

import type { PrimitiveTypeMap, PrimitiveTypeStr, Type } from "../common.types";
import type { DateTime } from "../types/date-time";
import type { DateOnly } from "../types/date-only";
import type { Time } from "../types/time";

//#region 인터페이스

export interface ReadonlyArrayExt<TItem> {
  /**
   * 조건에 맞는 단일 요소 반환
   * @param predicate 필터 조건 (생략 시 배열 전체 대상)
   * @returns 요소가 없으면 undefined
   * @throws ArgumentError 조건에 맞는 요소가 2개 이상이면 발생
   */
  single(predicate?: (item: TItem, index: number) => boolean): TItem | undefined;

  /**
   * 첫 번째 요소 반환
   * @param predicate 필터 조건 (생략 시 첫 번째 요소 반환)
   * @returns 요소가 없으면 undefined
   */
  first(predicate?: (item: TItem, index: number) => boolean): TItem | undefined;

  /** 비동기 필터 (순차 실행) */
  filterAsync(predicate: (item: TItem, index: number) => Promise<boolean>): Promise<TItem[]>;

  /**
   * 마지막 요소 반환
   * @param predicate 필터 조건 (생략 시 마지막 요소 반환)
   * @returns 요소가 없으면 undefined
   */
  last(predicate?: (item: TItem, index: number) => boolean): TItem | undefined;

  /** null/undefined 제거 */
  filterExists(): NonNullable<TItem>[];

  /** 특정 타입의 요소만 필터링 (PrimitiveTypeStr 또는 생성자 타입) */
  ofType<K extends PrimitiveTypeStr>(type: K): Extract<TItem, PrimitiveTypeMap[K]>[];
  ofType<N extends TItem>(type: Type<N>): N[];

  /** 비동기 매핑 (순차 실행) */
  mapAsync<R>(selector: (item: TItem, index: number) => Promise<R>): Promise<R[]>;

  /** 중첩 배열 평탄화 */
  mapMany(): TItem extends readonly (infer U)[] ? U[] : TItem;

  /** 매핑 후 평탄화 */
  mapMany<R>(selector: (item: TItem, index: number) => R[]): R[];

  /** 비동기 매핑 후 평탄화 (순차 실행) */
  mapManyAsync<R>(selector: (item: TItem, index: number) => Promise<R[]>): Promise<R[]>;

  /**
   * 비동기 병렬 처리 (Promise.all 사용)
   * @note 하나라도 reject되면 전체가 fail-fast로 reject됨 (Promise.all 동작)
   */
  parallelAsync<R>(fn: (item: TItem, index: number) => Promise<R>): Promise<R[]>;

  /**
   * 키 기준 그룹화
   * @param keySelector 그룹 키 선택 함수
   * @note O(n²) 복잡도 (객체 키 지원을 위해 깊은 비교 사용). primitive 키만 필요하면 toArrayMap()이 O(n)으로 더 효율적
   */
  groupBy<K>(keySelector: (item: TItem, index: number) => K): { key: K; values: TItem[] }[];

  /**
   * 키 기준 그룹화 (값 변환 포함)
   * @param keySelector 그룹 키 선택 함수
   * @param valueSelector 값 변환 함수
   * @note O(n²) 복잡도 (객체 키 지원을 위해 깊은 비교 사용). primitive 키만 필요하면 toArrayMap()이 O(n)으로 더 효율적
   */
  groupBy<K, V>(
    keySelector: (item: TItem, index: number) => K,
    valueSelector: (item: TItem, index: number) => V,
  ): {
    key: K;
    values: V[];
  }[];

  toMap<K>(keySelector: (item: TItem, index: number) => K): Map<K, TItem>;

  toMap<K, V>(
    keySelector: (item: TItem, index: number) => K,
    valueSelector: (item: TItem, index: number) => V,
  ): Map<K, V>;

  toMapAsync<K>(keySelector: (item: TItem, index: number) => Promise<K>): Promise<Map<K, TItem>>;

  toMapAsync<K, V>(
    keySelector: (item: TItem, index: number) => Promise<K> | K,
    valueSelector: (item: TItem, index: number) => Promise<V> | V,
  ): Promise<Map<K, V>>;

  toArrayMap<K>(keySelector: (item: TItem, index: number) => K): Map<K, TItem[]>;

  toArrayMap<K, V>(
    keySelector: (item: TItem, index: number) => K,
    valueSelector: (item: TItem, index: number) => V,
  ): Map<K, V[]>;

  toSetMap<K>(keySelector: (item: TItem, index: number) => K): Map<K, Set<TItem>>;
  toSetMap<K, V>(
    keySelector: (item: TItem, index: number) => K,
    valueSelector: (item: TItem, index: number) => V,
  ): Map<K, Set<V>>;

  toMapValues<K, V>(
    keySelector: (item: TItem, index: number) => K,
    valueSelector: (items: TItem[]) => V,
  ): Map<K, V>;

  toObject(keySelector: (item: TItem, index: number) => string): Record<string, TItem>;

  toObject<V>(
    keySelector: (item: TItem, index: number) => string,
    valueSelector: (item: TItem, index: number) => V,
  ): Record<string, V>;

  /**
   * 평탄한 배열을 트리 구조로 변환한다
   *
   * @param keyProp 각 항목의 고유 키 속성명
   * @param parentKey 부모 항목의 키를 참조하는 속성명
   * @returns 루트 항목들의 배열 (각 항목에 children 속성 추가)
   *
   * @remarks
   * - parentKey 값이 null/undefined인 항목이 루트가 된다
   * - 내부적으로 toArrayMap을 사용하여 O(n) 복잡도로 처리한다
   * - 원본 항목은 복사되어 children 속성이 추가된다
   *
   * @example
   * ```typescript
   * interface Item {
   *   id: number;
   *   parentId?: number;
   *   name: string;
   * }
   *
   * const items: Item[] = [
   *   { id: 1, name: "root" },
   *   { id: 2, parentId: 1, name: "child1" },
   *   { id: 3, parentId: 1, name: "child2" },
   *   { id: 4, parentId: 2, name: "grandchild" },
   * ];
   *
   * const tree = items.toTree("id", "parentId");
   * // [{ id: 1, name: "root", children: [
   * //   { id: 2, name: "child1", children: [
   * //     { id: 4, name: "grandchild", children: [] }
   * //   ]},
   * //   { id: 3, name: "child2", children: [] }
   * // ]}]
   * ```
   */
  toTree<K extends keyof TItem, P extends keyof TItem>(
    keyProp: K,
    parentKey: P,
  ): TreeArray<TItem>[];

  /**
   * 중복 제거
   * @param options matchAddress: 주소 비교 (true면 Set 사용), keyFn: 커스텀 키 함수 (O(n) 성능)
   * @note 객체 배열에서 keyFn 없이 사용 시 O(n²) 복잡도. 대량 데이터는 keyFn 사용 권장
   */
  distinct(
    options?: boolean | { matchAddress?: boolean; keyFn?: (item: TItem) => string | number },
  ): TItem[];

  orderBy(
    selector?: (item: TItem) => string | number | DateOnly | DateTime | Time | undefined,
  ): TItem[];

  orderByDesc(
    selector?: (item: TItem) => string | number | DateOnly | DateTime | Time | undefined,
  ): TItem[];

  /**
   * 두 배열 비교 (INSERT/DELETE/UPDATE)
   * @param target 비교 대상 배열
   * @param options keys: 키 비교용, excludes: 비교 제외 속성
   * @note target에 중복 키가 있으면 첫 번째 매칭만 사용됨
   */
  diffs<TOtherItem>(
    target: TOtherItem[],
    options?: { keys?: string[]; excludes?: string[] },
  ): ArrayDiffsResult<TItem, TOtherItem>[];

  oneWayDiffs<K extends keyof TItem>(
    orgItems: TItem[] | Map<TItem[K], TItem>,
    keyPropNameOrGetValFn: K | ((item: TItem) => string | number | undefined),
    options?: {
      includeSame?: boolean;
      excludes?: string[];
      includes?: string[];
    },
  ): ArrayDiffs2Result<TItem>[];

  merge<TOtherItem>(
    target: TOtherItem[],
    options?: { keys?: string[]; excludes?: string[] },
  ): (TItem | TOtherItem | (TItem & TOtherItem))[];

  /**
   * 요소의 합계 반환
   * @param selector 값 선택 함수 (생략 시 요소 자체를 number로 사용)
   * @returns 빈 배열인 경우 0 반환
   */
  sum(selector?: (item: TItem, index: number) => number): number;

  min(): TItem extends number | string ? TItem | undefined : never;

  min<P extends number | string>(selector?: (item: TItem, index: number) => P): P | undefined;

  max(): TItem extends number | string ? TItem | undefined : never;

  max<P extends number | string>(selector?: (item: TItem, index: number) => P): P | undefined;

  shuffle(): TItem[];
}

/**
 * 원본 배열을 변경하는 확장 메서드
 * @mutates 모든 메서드가 원본 배열을 직접 변경합니다
 */
export interface MutableArrayExt<TItem> {
  /**
   * 원본 배열에서 중복 제거
   * @param options matchAddress: 주소 비교 (true면 Set 사용), keyFn: 커스텀 키 함수 (O(n) 성능)
   * @note 객체 배열에서 keyFn 없이 사용 시 O(n²) 복잡도. 대량 데이터는 keyFn 사용 권장
   * @mutates
   */
  distinctThis(
    options?: boolean | { matchAddress?: boolean; keyFn?: (item: TItem) => string | number },
  ): TItem[];

  /** 원본 배열 오름차순 정렬 @mutates */
  orderByThis(
    selector?: (item: TItem) => string | number | DateOnly | DateTime | Time | undefined,
  ): TItem[];

  /** 원본 배열 내림차순 정렬 @mutates */
  orderByDescThis(
    selector?: (item: TItem) => string | number | DateOnly | DateTime | Time | undefined,
  ): TItem[];

  /** 원본 배열에 항목 삽입 @mutates */
  insert(index: number, ...items: TItem[]): this;

  /** 원본 배열에서 항목 제거 @mutates */
  remove(item: TItem): this;

  /** 원본 배열에서 조건에 맞는 항목 제거 @mutates */
  remove(selector: (item: TItem, index: number) => boolean): this;

  /** 원본 배열에서 항목 토글 (있으면 제거, 없으면 추가) @mutates */
  toggle(item: TItem): this;

  /** 원본 배열 비우기 @mutates */
  clear(): this;
}

//#endregion

//#region 내보내기 타입

export type ArrayDiffsResult<TOriginal, TOther> =
  | { source: undefined; target: TOther } // INSERT
  | { source: TOriginal; target: undefined } // DELETE
  | { source: TOriginal; target: TOther }; // UPDATE

export type ArrayDiffs2Result<TItem> =
  | { type: "create"; item: TItem; orgItem: undefined }
  | { type: "update"; item: TItem; orgItem: TItem }
  | { type: "same"; item: TItem; orgItem: TItem };

export type TreeArray<TNode> = TNode & { children: TreeArray<TNode>[] };

/** 정렬/비교 가능한 타입 */
export type ComparableType = string | number | boolean | DateTime | DateOnly | Time | undefined;

//#endregion
