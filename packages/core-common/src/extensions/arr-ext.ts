/**
 * Array extension methods
 *
 * @remarks See type definition file (arr-ext.types.ts) for TSDoc of each method
 */

import "./map-ext";
import { clone, equal, merge } from "../utils/obj";
import type { PrimitiveTypeStr, Type } from "../common.types";
import { DateTime } from "../types/date-time";
import { DateOnly } from "../types/date-only";
import { Time } from "../types/time";
import { Uuid } from "../types/uuid";
import { ArgumentError } from "../errors/argument-error";
import { SdError } from "../errors/sd-error";
import { compareForOrder, getDistinctIndices } from "./arr-ext.helpers";
import type {
  ReadonlyArrayExt,
  MutableArrayExt,
  ArrayDiffsResult,
  ArrayOneWayDiffResult,
  TreeArray,
} from "./arr-ext.types";

//#region Implementation

const arrayReadonlyExtensions: ReadonlyArrayExt<any> & ThisType<any[]> = {
  single<T>(predicate?: (item: T, index: number) => boolean): T | undefined {
    const arr = predicate !== undefined ? this.filter(predicate) : this;
    if (arr.length > 1) {
      throw new ArgumentError("Multiple results found.", { count: arr.length });
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
    // PrimitiveTypeStr case
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
            // exhaustive check: Compilation error when a new type is added to PrimitiveTypeStr
            const _exhaustive: never = type;
            throw new ArgumentError(`Unsupported type: ${_exhaustive}`);
          }
        }
      }) as N[];
    }

    // Type<N> (constructor) case
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

  // Group array by key
  // Performance considerations:
  // - primitive key (string, number, etc.): O(n) - Map-based
  // - object key: O(n²) - objEqual comparison
  groupBy<T, K, V>(
    keySelector: (item: T, index: number) => K,
    valueSelector?: (item: T, index: number) => V,
  ): {
    key: K;
    values: (V | T)[];
  }[] {
    const result: { key: K; values: (V | T)[] }[] = [];

    // Map for primitive key optimization (key string -> result index)
    const primitiveKeyIndex = new Map<string, number>();

    for (let i = 0; i < this.length; i++) {
      const keyObj = keySelector(this[i], i);
      const valueObj = valueSelector !== undefined ? valueSelector(this[i], i) : this[i];

      // primitive keys are processed in O(n) using Map
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

      // Object keys use the existing approach O(n²)
      const existsRecord = result.find((item) => equal(item.key, keyObj));
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
        throw new ArgumentError("Duplicated key.", { duplicatedKey: keyObj });
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
        throw new ArgumentError("Duplicated key.", { duplicatedKey: keyObj });
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

      // undefined values are treated as "none", allowing overwrite
      if (result[key] !== undefined) {
        throw new ArgumentError("Duplicated key.", { duplicatedKey: key });
      }
      result[key] = valueObj;
    }

    return result;
  },

  toTree<T, K extends keyof T, P extends keyof T>(key: K, parentKey: P): TreeArray<T>[] {
    // O(n) optimization: Map-based indexing
    const childrenMap = this.toArrayMap((item) => item[parentKey]);

    const fn = (items: T[]): TreeArray<T>[] => {
      return items.map((item) => ({
        ...clone(item),
        children: fn(childrenMap.get(item[key]) ?? []),
      }));
    };

    const rootItems = this.filter((item1) => item1[parentKey] == null);
    return fn(rootItems);
  },

  distinct<T>(
    options?: boolean | { matchAddress?: boolean; keyFn?: (item: T) => string | number },
  ): T[] {
    const keptIndices = getDistinctIndices(this, options);
    return Array.from(keptIndices).map((i) => this[i]);
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

    // If keys option is provided, pre-index target by keys in Map to improve O(n×m) → O(n+m)
    // Multiple targets with the same key value can exist, so store as array
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
      // Prioritize full match (sameTarget), otherwise search for key match (sameKeyTarget)
      let sameTarget: P | undefined;
      let sameKeyTarget: P | undefined;

      // Skip already matched items using Set-based skipping (avoid O(n) splice removal)
      for (const targetItem of uncheckedTarget) {
        if (!uncheckedTargetSet.has(targetItem)) continue;
        if (equal(targetItem, sourceItem, excludeOpts)) {
          sameTarget = targetItem;
          break;
        }
      }

      // If no full match and keys option exists, perform O(1) lookup in Map
      if (sameTarget === undefined && keyIndexedTarget) {
        const sourceKeyStr = JSON.stringify(
          options!.keys!.map((k) => (sourceItem as Record<string, unknown>)[k]),
        );
        const candidates = keyIndexedTarget.get(sourceKeyStr);
        if (candidates && candidates.length > 0) {
          // Select first remaining item using O(1) lookup in uncheckedTargetSet
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
  ): ArrayOneWayDiffResult<T>[] {
    const orgItemMap =
      orgItems instanceof Map
        ? orgItems
        : orgItems.toMap((orgItem) =>
            typeof keyPropNameOrGetValFn === "function"
              ? keyPropNameOrGetValFn(orgItem)
              : orgItem[keyPropNameOrGetValFn],
          );
    const includeSame = options?.includeSame ?? false;

    const diffs: ArrayOneWayDiffResult<T>[] = [];
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
        equal(orgItem, item, {
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

    const result: (T | P | (T & P))[] = clone(this);

    // Pre-calculate original index of source items to improve O(n) lookup to O(1)
    const sourceIndexMap = new Map<T, number>();
    for (let i = 0; i < this.length; i++) {
      sourceIndexMap.set(this[i], i);
    }

    for (const diff of diffs) {
      // When updating
      if (diff.source !== undefined && diff.target !== undefined) {
        const sourceIndex = sourceIndexMap.get(diff.source);
        if (sourceIndex === undefined) {
          throw new SdError("Unexpected error: source item not found in merge.");
        }
        result[sourceIndex] = merge(diff.source, diff.target);
      }
      // When adding
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
        throw new ArgumentError("sum can only be used with numbers.", {
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
        throw new ArgumentError("min can only be used with numbers/strings.", {
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
        throw new ArgumentError("max can only be used with numbers/strings.", {
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
    const keptIndices = getDistinctIndices(this, options);
    const indicesToRemove = [];
    for (let i = 0; i < this.length; i++) {
      if (!keptIndices.has(i)) {
        indicesToRemove.push(i);
      }
    }
    // Remove in reverse order to prevent index shifts
    for (let i = indicesToRemove.length - 1; i >= 0; i--) {
      this.splice(indicesToRemove[i], 1);
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

    // Reverse traversal to prevent index change issues (O(n) performance)
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

//#region Type Declarations

declare global {
  interface ReadonlyArray<T> extends ReadonlyArrayExt<T> {}
  interface Array<T> extends ReadonlyArrayExt<T>, MutableArrayExt<T> {}
}

//#endregion

export type {
  ArrayDiffsResult,
  ArrayOneWayDiffResult,
  TreeArray,
  ComparableType,
} from "./arr-ext.types";
