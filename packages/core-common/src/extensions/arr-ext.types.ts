/**
 * Array 확장 타입 정의
 */

import type { PrimitiveTypeMap, PrimitiveTypeStr, Type } from "../common.types";
import type { DateTime } from "../types/date-time";
import type { DateOnly } from "../types/date-only";
import type { Time } from "../types/time";

//#region Interfaces

export interface ReadonlyArrayExt<TItem> {
  /**
   * 조건에 맞는 단일 요소 반환
   * @param predicate 필터 조건 (생략 시 전체 array 대상)
   * @returns 요소가 없으면 undefined
   * @throws ArgumentError 2개 이상의 요소가 조건에 맞을 경우
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

  /** 특정 타입의 요소만 필터 (PrimitiveTypeStr 또는 생성자 타입) */
  ofType<TKey extends PrimitiveTypeStr>(type: TKey): Extract<TItem, PrimitiveTypeMap[TKey]>[];
  ofType<TNarrow extends TItem>(type: Type<TNarrow>): TNarrow[];

  /** 비동기 매핑 (순차 실행) */
  mapAsync<TResult>(selector: (item: TItem, index: number) => Promise<TResult>): Promise<TResult[]>;

  /** 중첩 array 평탄화 */
  mapMany(): TItem extends readonly (infer U)[] ? U[] : TItem;

  /** 매핑 후 평탄화 */
  mapMany<TResult>(selector: (item: TItem, index: number) => TResult[]): TResult[];

  /** 비동기 매핑 후 평탄화 (순차 실행) */
  mapManyAsync<TResult>(selector: (item: TItem, index: number) => Promise<TResult[]>): Promise<TResult[]>;

  /**
   * 비동기 병렬 처리 (Promise.all 사용)
   * @note 하나라도 reject되면 전체가 즉시 reject됨 (Promise.all 동작)
   */
  parallelAsync<TResult>(fn: (item: TItem, index: number) => Promise<TResult>): Promise<TResult[]>;

  /**
   * key 기준 그룹화
   * @param keySelector 그룹의 key 선택 함수
   * @note O(n²) 복잡도 (객체 key 지원을 위한 깊은 비교). 원시 key만 필요하면 toArrayMap()이 O(n)으로 더 효율적
   */
  groupBy<TKey>(keySelector: (item: TItem, index: number) => TKey): { key: TKey; values: TItem[] }[];

  /**
   * key 기준 그룹화 (value 변환 포함)
   * @param keySelector 그룹의 key 선택 함수
   * @param valueSelector value 변환 함수
   * @note O(n²) 복잡도 (객체 key 지원을 위한 깊은 비교). 원시 key만 필요하면 toArrayMap()이 O(n)으로 더 효율적
   */
  groupBy<TKey, TValue>(
    keySelector: (item: TItem, index: number) => TKey,
    valueSelector: (item: TItem, index: number) => TValue,
  ): {
    key: TKey;
    values: TValue[];
  }[];

  toMap<TKey>(keySelector: (item: TItem, index: number) => TKey): Map<TKey, TItem>;

  toMap<TKey, TValue>(
    keySelector: (item: TItem, index: number) => TKey,
    valueSelector: (item: TItem, index: number) => TValue,
  ): Map<TKey, TValue>;

  toMapAsync<TKey>(keySelector: (item: TItem, index: number) => Promise<TKey>): Promise<Map<TKey, TItem>>;

  toMapAsync<TKey, TValue>(
    keySelector: (item: TItem, index: number) => Promise<TKey> | TKey,
    valueSelector: (item: TItem, index: number) => Promise<TValue> | TValue,
  ): Promise<Map<TKey, TValue>>;

  toArrayMap<TKey>(keySelector: (item: TItem, index: number) => TKey): Map<TKey, TItem[]>;

  toArrayMap<TKey, TValue>(
    keySelector: (item: TItem, index: number) => TKey,
    valueSelector: (item: TItem, index: number) => TValue,
  ): Map<TKey, TValue[]>;

  toSetMap<TKey>(keySelector: (item: TItem, index: number) => TKey): Map<TKey, Set<TItem>>;
  toSetMap<TKey, TValue>(
    keySelector: (item: TItem, index: number) => TKey,
    valueSelector: (item: TItem, index: number) => TValue,
  ): Map<TKey, Set<TValue>>;

  toMapValues<TKey, TValue>(
    keySelector: (item: TItem, index: number) => TKey,
    valueSelector: (items: TItem[]) => TValue,
  ): Map<TKey, TValue>;

  toObject(keySelector: (item: TItem, index: number) => string): Record<string, TItem>;

  toObject<TValue>(
    keySelector: (item: TItem, index: number) => string,
    valueSelector: (item: TItem, index: number) => TValue,
  ): Record<string, TValue>;

  /**
   * 평면 array를 트리 구조로 변환
   *
   * @param keyProp 각 항목의 고유 key 속성명
   * @param parentKey 부모 항목의 key를 참조하는 속성명
   * @returns 루트 항목 array (각 항목에 children 속성이 추가됨)
   *
   * @remarks
   * - parentKey 값이 null/undefined인 항목이 루트가 됨
   * - 내부적으로 toArrayMap을 사용하여 O(n) 복잡도
   * - 원본 항목은 복사되고 children 속성이 추가됨
   */
  toTree<K extends keyof TItem, P extends keyof TItem>(
    keyProp: K,
    parentKey: P,
  ): TreeArray<TItem>[];

  /**
   * 중복 제거
   * @param options matchAddress: 주소 비교 (true면 Set 사용), keyFn: 커스텀 key 함수 (O(n) 성능)
   * @note 객체 array에서 keyFn 없이 사용하면 O(n²) 복잡도. 대량 데이터에는 keyFn 사용 권장
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
   * 두 array 비교 (INSERT/DELETE/UPDATE)
   * @param target 비교할 array
   * @param options keys: key 비교용, excludes: 비교에서 제외할 속성
   * @note target에 중복 key가 있으면 첫 번째 매칭만 사용됨
   */
  diffs<TOtherItem>(
    target: TOtherItem[],
  ): ArrayDiffsResult<TItem, TOtherItem>[];

  diffs<TOtherItem extends Record<string, unknown> = Record<string, unknown>>(
    target: TOtherItem[],
    options: {
      keys: ((keyof TItem | keyof TOtherItem) & string)[];
      excludes?: ((keyof TItem | keyof TOtherItem) & string)[];
    },
  ): ArrayDiffsResult<TItem, TOtherItem>[];

  diffs<TOtherItem extends Record<string, unknown> = Record<string, unknown>>(
    target: TOtherItem[],
    options: {
      excludes: ((keyof TItem | keyof TOtherItem) & string)[];
    },
  ): ArrayDiffsResult<TItem, TOtherItem>[];

  oneWayDiffs<TKey extends keyof TItem>(
    orgItems: TItem[] | Map<TItem[TKey], TItem>,
    keyPropNameOrGetValFn: TKey | ((item: TItem) => string | number | undefined),
    options?: {
      includeSame?: boolean;
      excludes?: string[];
      includes?: string[];
    },
  ): ArrayOneWayDiffResult<TItem>[];

  merge<TOtherItem>(
    target: TOtherItem[],
  ): (TItem | TOtherItem | (TItem & TOtherItem))[];

  merge<TOtherItem extends Record<string, unknown> = Record<string, unknown>>(
    target: TOtherItem[],
    options: {
      keys: ((keyof TItem | keyof TOtherItem) & string)[];
      excludes?: ((keyof TItem | keyof TOtherItem) & string)[];
    },
  ): (TItem | TOtherItem | (TItem & TOtherItem))[];

  merge<TOtherItem extends Record<string, unknown> = Record<string, unknown>>(
    target: TOtherItem[],
    options: {
      excludes: ((keyof TItem | keyof TOtherItem) & string)[];
    },
  ): (TItem | TOtherItem | (TItem & TOtherItem))[];

  /**
   * 요소의 합계 반환
   * @param selector value 선택 함수 (생략 시 요소 자체를 숫자로 사용)
   * @returns array가 비어 있으면 0
   */
  sum(selector?: (item: TItem, index: number) => number): number;

  min(): TItem extends number | string ? TItem | undefined : never;

  min<TProp extends number | string>(selector?: (item: TItem, index: number) => TProp): TProp | undefined;

  max(): TItem extends number | string ? TItem | undefined : never;

  max<TProp extends number | string>(selector?: (item: TItem, index: number) => TProp): TProp | undefined;

  shuffle(): TItem[];
}

/**
 * 원본 array를 변경하는 확장 메서드
 * @mutates 모든 메서드가 원본 array를 직접 수정함
 */
export interface MutableArrayExt<TItem> {
  /**
   * 원본 array에서 중복 제거
   * @param options matchAddress: 주소 비교 (true면 Set 사용), keyFn: 커스텀 key 함수 (O(n) 성능)
   * @note 객체 array에서 keyFn 없이 사용하면 O(n²) 복잡도. 대량 데이터에는 keyFn 사용 권장
   * @mutates
   */
  distinctThis(
    options?: boolean | { matchAddress?: boolean; keyFn?: (item: TItem) => string | number },
  ): TItem[];

  /** 원본 array를 오름차순 정렬 @mutates */
  orderByThis(
    selector?: (item: TItem) => string | number | DateOnly | DateTime | Time | undefined,
  ): TItem[];

  /** 원본 array를 내림차순 정렬 @mutates */
  orderByDescThis(
    selector?: (item: TItem) => string | number | DateOnly | DateTime | Time | undefined,
  ): TItem[];

  /** 원본 array에 항목 삽입 @mutates */
  insert(index: number, ...items: TItem[]): this;

  /** 원본 array에서 항목 제거 @mutates */
  remove(item: TItem): this;

  /** 원본 array에서 조건에 맞는 항목 제거 @mutates */
  remove(selector: (item: TItem, index: number) => boolean): this;

  /** 원본 array에서 항목 토글 (있으면 제거, 없으면 추가) @mutates */
  toggle(item: TItem): this;

  /** 원본 array 비우기 @mutates */
  clear(): this;
}

//#endregion

//#region Export Types

export type ArrayDiffsResult<TOriginal, TOther> =
  | { source: undefined; target: TOther } // INSERT
  | { source: TOriginal; target: undefined } // DELETE
  | { source: TOriginal; target: TOther }; // UPDATE

export type ArrayOneWayDiffResult<TItem> =
  | { type: "create"; item: TItem; orgItem: undefined }
  | { type: "update"; item: TItem; orgItem: TItem }
  | { type: "same"; item: TItem; orgItem: TItem };

export type TreeArray<TNode> = TNode & { children: TreeArray<TNode>[] };

/** 정렬/비교 가능한 타입 */
export type ComparableType = string | number | boolean | DateTime | DateOnly | Time | undefined;

//#endregion
