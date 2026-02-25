/**
 * Array extension type definitions
 */

import type { PrimitiveTypeMap, PrimitiveTypeStr, Type } from "../common.types";
import type { DateTime } from "../types/date-time";
import type { DateOnly } from "../types/date-only";
import type { Time } from "../types/time";

//#region Interfaces

export interface ReadonlyArrayExt<TItem> {
  /**
   * Return single element matching condition
   * @param predicate Filter condition (if omitted, entire array is target)
   * @returns undefined if element does not exist
   * @throws ArgumentError If 2 or more elements match condition
   */
  single(predicate?: (item: TItem, index: number) => boolean): TItem | undefined;

  /**
   * Return first element
   * @param predicate Filter condition (if omitted, returns first element)
   * @returns undefined if element does not exist
   */
  first(predicate?: (item: TItem, index: number) => boolean): TItem | undefined;

  /** Async filter (sequential execution) */
  filterAsync(predicate: (item: TItem, index: number) => Promise<boolean>): Promise<TItem[]>;

  /**
   * Return last element
   * @param predicate Filter condition (if omitted, returns last element)
   * @returns undefined if element does not exist
   */
  last(predicate?: (item: TItem, index: number) => boolean): TItem | undefined;

  /** Remove null/undefined */
  filterExists(): NonNullable<TItem>[];

  /** Filter only elements of specific type (PrimitiveTypeStr or constructor type) */
  ofType<K extends PrimitiveTypeStr>(type: K): Extract<TItem, PrimitiveTypeMap[K]>[];
  ofType<N extends TItem>(type: Type<N>): N[];

  /** Async mapping (sequential execution) */
  mapAsync<R>(selector: (item: TItem, index: number) => Promise<R>): Promise<R[]>;

  /** Flatten nested array */
  mapMany(): TItem extends readonly (infer U)[] ? U[] : TItem;

  /** Map and then flatten */
  mapMany<R>(selector: (item: TItem, index: number) => R[]): R[];

  /** Async mapping and then flatten (sequential execution) */
  mapManyAsync<R>(selector: (item: TItem, index: number) => Promise<R[]>): Promise<R[]>;

  /**
   * Async parallel processing (using Promise.all)
   * @note If any rejects, entire operation fail-fast rejects (Promise.all behavior)
   */
  parallelAsync<R>(fn: (item: TItem, index: number) => Promise<R>): Promise<R[]>;

  /**
   * Group by key
   * @param keySelector Key selection function for group
   * @note O(n²) complexity (deep comparison for object key support). If only primitive keys are needed, toArrayMap() is more efficient at O(n)
   */
  groupBy<K>(keySelector: (item: TItem, index: number) => K): { key: K; values: TItem[] }[];

  /**
   * Group by key (with value transformation)
   * @param keySelector Key selection function for group
   * @param valueSelector Value transformation function
   * @note O(n²) complexity (deep comparison for object key support). If only primitive keys are needed, toArrayMap() is more efficient at O(n)
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
   * Convert flat array to tree structure
   *
   * @param keyProp Unique key property name of each item
   * @param parentKey Property name referencing parent item's key
   * @returns Array of root items (each item has children property added)
   *
   * @remarks
   * - Items with null/undefined parentKey value become roots
   * - Internally uses toArrayMap for O(n) complexity
   * - Original items are copied with children property added
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
   * Remove duplicates
   * @param options matchAddress: address comparison (true uses Set), keyFn: custom key function (O(n) performance)
   * @note O(n²) complexity when used without keyFn on object arrays. Using keyFn is recommended for large data
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
   * Compare two arrays (INSERT/DELETE/UPDATE)
   * @param target Array to compare with
   * @param options keys: for key comparison, excludes: properties to exclude from comparison
   * @note If target has duplicate keys, only first match is used
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
   * Return sum of elements
   * @param selector Value selection function (if omitted, element itself is used as number)
   * @returns 0 if array is empty
   */
  sum(selector?: (item: TItem, index: number) => number): number;

  min(): TItem extends number | string ? TItem | undefined : never;

  min<P extends number | string>(selector?: (item: TItem, index: number) => P): P | undefined;

  max(): TItem extends number | string ? TItem | undefined : never;

  max<P extends number | string>(selector?: (item: TItem, index: number) => P): P | undefined;

  shuffle(): TItem[];
}

/**
 * Extension methods that mutate the original array
 * @mutates All methods directly modify the original array
 */
export interface MutableArrayExt<TItem> {
  /**
   * Remove duplicates from original array
   * @param options matchAddress: address comparison (true uses Set), keyFn: custom key function (O(n) performance)
   * @note O(n²) complexity when used without keyFn on object arrays. Using keyFn is recommended for large data
   * @mutates
   */
  distinctThis(
    options?: boolean | { matchAddress?: boolean; keyFn?: (item: TItem) => string | number },
  ): TItem[];

  /** Sort original array in ascending order @mutates */
  orderByThis(
    selector?: (item: TItem) => string | number | DateOnly | DateTime | Time | undefined,
  ): TItem[];

  /** Sort original array in descending order @mutates */
  orderByDescThis(
    selector?: (item: TItem) => string | number | DateOnly | DateTime | Time | undefined,
  ): TItem[];

  /** Insert items into original array @mutates */
  insert(index: number, ...items: TItem[]): this;

  /** Remove item from original array @mutates */
  remove(item: TItem): this;

  /** Remove items matching condition from original array @mutates */
  remove(selector: (item: TItem, index: number) => boolean): this;

  /** Toggle item in original array (remove if exists, add if not) @mutates */
  toggle(item: TItem): this;

  /** Clear original array @mutates */
  clear(): this;
}

//#endregion

//#region Export Types

export type ArrayDiffsResult<TOriginal, TOther> =
  | { source: undefined; target: TOther } // INSERT
  | { source: TOriginal; target: undefined } // DELETE
  | { source: TOriginal; target: TOther }; // UPDATE

export type ArrayDiffs2Result<TItem> =
  | { type: "create"; item: TItem; orgItem: undefined }
  | { type: "update"; item: TItem; orgItem: TItem }
  | { type: "same"; item: TItem; orgItem: TItem };

export type TreeArray<TNode> = TNode & { children: TreeArray<TNode>[] };

/** Type that can be sorted/compared */
export type ComparableType = string | number | boolean | DateTime | DateOnly | Time | undefined;

//#endregion
