import { DateTime } from "../types/date-time";
import { DateOnly } from "../types/date-only";
import { Time } from "../types/time";
import { Uuid } from "../types/uuid";
import { ArgumentError } from "../errors/argument-error";

//#region objClone

/**
 * Deep clone
 * - Supports circular references
 * - Supports copying custom types (DateTime, DateOnly, Time, Uuid, Uint8Array)
 *
 * @note Functions and Symbols are not cloned and references are maintained
 * @note WeakMap and WeakSet are not supported (copied as generic objects, resulting in empty objects)
 * @note Prototype chain is maintained (using Object.setPrototypeOf)
 * @note Getters/setters are evaluated as current values and copied (accessor properties themselves are not copied)
 */
export function objClone<TSource>(source: TSource): TSource {
  return objCloneImpl(source) as TSource;
}

function objCloneImpl(source: unknown, prevClones?: WeakMap<object, unknown>): unknown {
  // Primitives are returned as-is
  if (typeof source !== "object" || source === null) {
    return source;
  }

  // Immutable-like types (no internal object references)
  if (source instanceof Date) {
    return new Date(source.getTime());
  }

  if (source instanceof DateTime) {
    return new DateTime(source.tick);
  }

  if (source instanceof DateOnly) {
    return new DateOnly(source.tick);
  }

  if (source instanceof Time) {
    return new Time(source.tick);
  }

  if (source instanceof Uuid) {
    return new Uuid(source.toString());
  }

  // RegExp
  if (source instanceof RegExp) {
    return new RegExp(source.source, source.flags);
  }

  // Circular reference check (applies to all object types including Error)
  const currPrevClones = prevClones ?? new WeakMap<object, unknown>();
  if (currPrevClones.has(source)) {
    return currPrevClones.get(source);
  }

  // Error (including cause)
  // Prototype-based copying instead of constructor call - ensures custom Error class compatibility
  if (source instanceof Error) {
    const cloned = Object.create(Object.getPrototypeOf(source)) as Error;
    currPrevClones.set(source, cloned);
    cloned.message = source.message;
    cloned.name = source.name;
    cloned.stack = source.stack;
    if (source.cause !== undefined) {
      cloned.cause = objCloneImpl(source.cause, currPrevClones);
    }
    // Copy custom Error properties
    for (const key of Object.keys(source)) {
      if (!["message", "name", "stack", "cause"].includes(key)) {
        (cloned as unknown as Record<string, unknown>)[key] = objCloneImpl(
          (source as unknown as Record<string, unknown>)[key],
          currPrevClones,
        );
      }
    }
    return cloned;
  }

  if (source instanceof Uint8Array) {
    const result = source.slice();
    currPrevClones.set(source, result);
    return result;
  }

  if (source instanceof Array) {
    const result: unknown[] = [];
    currPrevClones.set(source, result);
    for (const item of source) {
      result.push(objCloneImpl(item, currPrevClones));
    }
    return result;
  }

  if (source instanceof Map) {
    const result = new Map();
    currPrevClones.set(source, result);
    for (const [key, value] of source) {
      result.set(objCloneImpl(key, currPrevClones), objCloneImpl(value, currPrevClones));
    }
    return result;
  }

  if (source instanceof Set) {
    const result = new Set();
    currPrevClones.set(source, result);
    for (const item of source) {
      result.add(objCloneImpl(item, currPrevClones));
    }
    return result;
  }

  // Other Object types
  const result: Record<string, unknown> = {};
  Object.setPrototypeOf(result, Object.getPrototypeOf(source));
  currPrevClones.set(source, result);

  for (const key of Object.keys(source)) {
    const value = (source as Record<string, unknown>)[key];
    result[key] = objCloneImpl(value, currPrevClones);
  }

  return result;
}

//#endregion

//#region objEqual

/** objEqual options type */
export interface EqualOptions {
  /** List of keys to compare. When specified, only those keys are compared (applies only to top level) */
  topLevelIncludes?: string[];
  /** List of keys to exclude from comparison (applies only to top level) */
  topLevelExcludes?: string[];
  /** Whether to ignore array order. O(n²) complexity when true */
  ignoreArrayIndex?: boolean;
  /** Whether to do shallow comparison. Only compare 1 level (reference comparison) when true */
  onlyOneDepth?: boolean;
}

/**
 * Deep equality comparison
 *
 * @param source Comparison target 1
 * @param target Comparison target 2
 * @param options Comparison options
 * @param options.topLevelIncludes List of keys to compare. When specified, only those keys are compared (applies only to top level)
 *   @example `{ topLevelIncludes: ["id", "name"] }` - Compare only id and name keys
 * @param options.topLevelExcludes List of keys to exclude from comparison (applies only to top level)
 *   @example `{ topLevelExcludes: ["updatedAt"] }` - Compare excluding updatedAt key
 * @param options.ignoreArrayIndex Whether to ignore array order. O(n²) complexity when true
 * @param options.onlyOneDepth Whether to do shallow comparison. Only compare 1 level (reference comparison) when true
 *
 * @note topLevelIncludes/topLevelExcludes options apply only to object property keys.
 *       All keys in Map are always included in comparison.
 * @note Performance considerations:
 * - Basic array comparison: O(n) time complexity
 * - When using `ignoreArrayIndex: true`: O(n²) time complexity
 *   (possible performance degradation on large arrays)
 * @note `ignoreArrayIndex: true` behavior characteristics:
 * - Ignore array order and check if elements are permutations of the same set
 * - Example: `[1,2,3]` and `[3,2,1]` → true, `[1,1,1]` and `[1,2,3]` → false
 */
export function objEqual(source: unknown, target: unknown, options?: EqualOptions): boolean {
  if (source === target) return true;
  if (source == null || target == null) return false;
  if (typeof source !== typeof target) return false;

  if (source instanceof Date && target instanceof Date) {
    return source.getTime() === target.getTime();
  }

  if (
    (source instanceof DateTime && target instanceof DateTime) ||
    (source instanceof DateOnly && target instanceof DateOnly) ||
    (source instanceof Time && target instanceof Time)
  ) {
    return source.tick === target.tick;
  }

  if (source instanceof Uuid && target instanceof Uuid) {
    return source.toString() === target.toString();
  }

  if (source instanceof RegExp && target instanceof RegExp) {
    return source.source === target.source && source.flags === target.flags;
  }

  if (source instanceof Array && target instanceof Array) {
    return objEqualArray(source, target, options);
  }

  if (source instanceof Map && target instanceof Map) {
    return objEqualMap(source, target, options);
  }

  if (source instanceof Set && target instanceof Set) {
    return objEqualSet(source, target, options);
  }

  if (typeof source === "object" && typeof target === "object") {
    return objEqualObject(
      source as Record<string, unknown>,
      target as Record<string, unknown>,
      options,
    );
  }

  return false;
}

function objEqualArray(source: unknown[], target: unknown[], options?: EqualOptions): boolean {
  if (source.length !== target.length) {
    return false;
  }

  if (options?.ignoreArrayIndex) {
    const matchedIndices = new Set<number>();

    if (options.onlyOneDepth) {
      return source.every((sourceItem) => {
        const idx = target.findIndex((t, i) => !matchedIndices.has(i) && t === sourceItem);
        if (idx !== -1) {
          matchedIndices.add(idx);
          return true;
        }
        return false;
      });
    } else {
      // On recursive calls, topLevelIncludes/topLevelExcludes options apply only to top level, so exclude them
      const recursiveOptions = {
        ignoreArrayIndex: options.ignoreArrayIndex,
        onlyOneDepth: options.onlyOneDepth,
      };
      return source.every((sourceItem) => {
        const idx = target.findIndex(
          (t, i) => !matchedIndices.has(i) && objEqual(t, sourceItem, recursiveOptions),
        );
        if (idx !== -1) {
          matchedIndices.add(idx);
          return true;
        }
        return false;
      });
    }
  } else {
    if (options?.onlyOneDepth) {
      for (let i = 0; i < source.length; i++) {
        if (source[i] !== target[i]) {
          return false;
        }
      }
    } else {
      // On recursive calls, topLevelIncludes/topLevelExcludes options apply only to top level, so exclude them
      for (let i = 0; i < source.length; i++) {
        if (
          !objEqual(source[i], target[i], {
            ignoreArrayIndex: options?.ignoreArrayIndex,
            onlyOneDepth: options?.onlyOneDepth,
          })
        ) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Map object comparison
 * @note O(n²) complexity when handling non-string keys (objects, arrays, etc.)
 * @note Recommended to use onlyOneDepth: true option for large datasets (improves to O(n) with reference comparison)
 */
function objEqualMap(
  source: Map<unknown, unknown>,
  target: Map<unknown, unknown>,
  options?: EqualOptions,
): boolean {
  // When comparing Maps, topLevelIncludes/topLevelExcludes options are ignored (apply only to object property keys)
  const sourceKeys = Array.from(source.keys()).filter((key) => source.get(key) != null);
  const targetKeys = Array.from(target.keys()).filter((key) => target.get(key) != null);

  if (sourceKeys.length !== targetKeys.length) {
    return false;
  }

  const usedTargetKeys = new Set<number>();
  for (const sourceKey of sourceKeys) {
    // String keys: compare directly
    if (typeof sourceKey === "string") {
      const sourceValue = source.get(sourceKey);
      const targetValue = target.get(sourceKey);
      if (options?.onlyOneDepth) {
        if (sourceValue !== targetValue) return false;
      } else {
        if (
          !objEqual(sourceValue, targetValue, {
            ignoreArrayIndex: options?.ignoreArrayIndex,
            onlyOneDepth: options?.onlyOneDepth,
          })
        ) {
          return false;
        }
      }
    } else {
      // Non-string keys: find equivalent key in targetKeys
      let found = false;
      for (let i = 0; i < targetKeys.length; i++) {
        const targetKey = targetKeys[i];
        if (typeof targetKey === "string" || usedTargetKeys.has(i)) continue;
        if (options?.onlyOneDepth ? sourceKey === targetKey : objEqual(sourceKey, targetKey)) {
          usedTargetKeys.add(i);
          const sourceValue = source.get(sourceKey);
          const targetValue = target.get(targetKey);
          if (options?.onlyOneDepth) {
            if (sourceValue !== targetValue) return false;
          } else {
            if (
              !objEqual(sourceValue, targetValue, {
                ignoreArrayIndex: options?.ignoreArrayIndex,
                onlyOneDepth: options?.onlyOneDepth,
              })
            ) {
              return false;
            }
          }
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
  }

  return true;
}

function objEqualObject(
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  options?: EqualOptions,
): boolean {
  const sourceKeys = Object.keys(source).filter(
    (key) =>
      (options?.topLevelIncludes === undefined || options.topLevelIncludes.includes(key)) &&
      !options?.topLevelExcludes?.includes(key) &&
      source[key] != null,
  );
  const targetKeys = Object.keys(target).filter(
    (key) =>
      (options?.topLevelIncludes === undefined || options.topLevelIncludes.includes(key)) &&
      !options?.topLevelExcludes?.includes(key) &&
      target[key] != null,
  );

  if (sourceKeys.length !== targetKeys.length) {
    return false;
  }

  for (const key of sourceKeys) {
    if (options?.onlyOneDepth) {
      if (source[key] !== target[key]) {
        return false;
      }
    } else {
      if (
        !objEqual(source[key], target[key], {
          ignoreArrayIndex: options?.ignoreArrayIndex,
        })
      ) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Set deep equality comparison
 * @note Deep equal comparison (`onlyOneDepth: false`) has O(n²) time complexity.
 *   Recommended to use `onlyOneDepth: true` for primitive Sets or when performance is critical
 */
function objEqualSet(source: Set<unknown>, target: Set<unknown>, options?: EqualOptions): boolean {
  if (source.size !== target.size) {
    return false;
  }

  if (options?.onlyOneDepth) {
    for (const sourceItem of source) {
      if (!target.has(sourceItem)) {
        return false;
      }
    }
  } else {
    // Deep equal: create target array only once outside loop
    // Track matched indices to prevent duplicate matching
    const targetArr = [...target];
    const matchedIndices = new Set<number>();
    for (const sourceItem of source) {
      const idx = targetArr.findIndex(
        (t, i) => !matchedIndices.has(i) && objEqual(sourceItem, t, options),
      );
      if (idx === -1) {
        return false;
      }
      matchedIndices.add(idx);
    }
  }

  return true;
}

//#endregion

//#region objMerge

/** objMerge options type */
export interface ObjMergeOptions {
  /** Array processing method. "replace": replace with target (default), "concat": merge (deduplicate) */
  arrayProcess?: "replace" | "concat";
  /** Whether to delete the key when target is null */
  useDelTargetNull?: boolean;
}

/**
 * Deep merge (merge target into source as base)
 *
 * @param source Base object
 * @param target Object to merge
 * @param opt Merge options
 * @param opt.arrayProcess Array processing method
 *   - `"replace"`: Replace with target array (default)
 *   - `"concat"`: Merge source and target arrays (deduplicate with Set)
 * @param opt.useDelTargetNull Whether to delete the key when target value is null
 *   - `true`: Delete the key from result if target is null
 *   - `false` or not specified: Keep source value
 *
 * @note Returns a new object without modifying original objects (guarantees immutability)
 * @note When using arrayProcess="concat", deduplication is done with Set,
 *       and for object arrays, deduplication is determined by reference (address) comparison
 * @note If types are different, overwrite with target value
 */
export function objMerge<TSource, TMergeTarget>(
  source: TSource,
  target: TMergeTarget,
  opt?: ObjMergeOptions,
): TSource & TMergeTarget {
  if (source == null) {
    return objClone(target) as TSource & TMergeTarget;
  }

  if (target === undefined) {
    return objClone(source) as TSource & TMergeTarget;
  }

  if (target === null) {
    return opt?.useDelTargetNull
      ? (undefined as TSource & TMergeTarget)
      : (objClone(source) as TSource & TMergeTarget);
  }

  if (typeof target !== "object") {
    return target as TSource & TMergeTarget;
  }

  if (
    target instanceof Date ||
    target instanceof DateTime ||
    target instanceof DateOnly ||
    target instanceof Time ||
    target instanceof Uuid ||
    target instanceof Uint8Array ||
    (opt?.arrayProcess === "replace" && target instanceof Array)
  ) {
    return objClone(target) as TSource & TMergeTarget;
  }

  // source가 object가 아니거나, source와 target이 다른 종류의 object면 target으로 덮어씀
  if (typeof source !== "object" || source.constructor !== target.constructor) {
    return objClone(target) as TSource & TMergeTarget;
  }

  if (source instanceof Map && target instanceof Map) {
    const result = objClone(source);
    for (const key of target.keys()) {
      if (result.has(key)) {
        result.set(key, objMerge(result.get(key), target.get(key), opt));
      } else {
        result.set(key, objClone(target.get(key)));
      }
    }
    return result as TSource & TMergeTarget;
  }

  if (opt?.arrayProcess === "concat" && source instanceof Array && target instanceof Array) {
    let result = [...new Set([...source, ...target])];
    if (opt.useDelTargetNull) {
      result = result.filter((item) => item !== null);
    }
    return result as TSource & TMergeTarget;
  }

  const sourceRec = source as Record<string, unknown>;
  const targetRec = target as Record<string, unknown>;
  const resultRec = objClone(sourceRec);
  for (const key of Object.keys(target)) {
    resultRec[key] = objMerge(sourceRec[key], targetRec[key], opt);
    if (resultRec[key] === undefined) {
      delete resultRec[key];
    }
  }

  return resultRec as TSource & TMergeTarget;
}

/** merge3 options type */
export interface ObjMerge3KeyOptions {
  /** List of sub-keys to compare (same as equal's topLevelIncludes) */
  keys?: string[];
  /** List of sub-keys to exclude from comparison */
  excludes?: string[];
  /** Whether to ignore array order */
  ignoreArrayIndex?: boolean;
}

/**
 * 3-way merge
 *
 * Merge by comparing three objects: source, origin, and target.
 * - If source and origin are equal and target differs → use target value
 * - If target and origin are equal and source differs → use source value
 * - If source and target are equal → use that value
 * - If all three values differ → conflict occurs (maintain origin value)
 *
 * @param source Changed version 1
 * @param origin Base version (common ancestor)
 * @param target Changed version 2
 * @param optionsObj Comparison options per key. Specify equal() comparison options individually for each key
 *   - `keys`: List of sub-keys to compare (same as equal's topLevelIncludes)
 *   - `excludes`: List of sub-keys to exclude from comparison
 *   - `ignoreArrayIndex`: Whether to ignore array order
 * @returns conflict: Whether conflict occurred, result: Merge result
 *
 * @example
 * const { conflict, result } = merge3(
 *   { a: 1, b: 2 },  // source
 *   { a: 1, b: 1 },  // origin
 *   { a: 2, b: 1 },  // target
 * );
 * // conflict: false, result: { a: 2, b: 2 }
 */
export function objMerge3<
  S extends Record<string, unknown>,
  O extends Record<string, unknown>,
  T extends Record<string, unknown>,
>(
  source: S,
  origin: O,
  target: T,
  optionsObj?: Record<string, ObjMerge3KeyOptions>,
): {
  conflict: boolean;
  result: O & S & T;
} {
  let conflict = false;
  const result = objClone(origin) as Record<string, unknown>;
  const allKeys = new Set([...Object.keys(source), ...Object.keys(target), ...Object.keys(origin)]);
  for (const key of allKeys) {
    if (objEqual(source[key], result[key], optionsObj?.[key])) {
      result[key] = objClone(target[key]);
    } else if (objEqual(target[key], result[key], optionsObj?.[key])) {
      result[key] = objClone(source[key]);
    } else if (objEqual(source[key], target[key], optionsObj?.[key])) {
      result[key] = objClone(source[key]);
    } else {
      conflict = true;
    }
  }

  return {
    conflict,
    result: result as O & S & T,
  };
}

//#endregion

//#region objOmit / objPick

/**
 * Exclude specific keys from object
 * @param item Source object
 * @param omitKeys Array of keys to exclude
 * @returns New object with specified keys excluded
 * @example
 * const user = { name: "Alice", age: 30, email: "alice@example.com" };
 * objOmit(user, ["email"]);
 * // { name: "Alice", age: 30 }
 */
export function objOmit<T extends Record<string, unknown>, K extends keyof T>(
  item: T,
  omitKeys: K[],
): Omit<T, K> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(item)) {
    if (!omitKeys.includes(key as K)) {
      result[key] = item[key];
    }
  }
  return result as Omit<T, K>;
}

/**
 * Exclude keys matching condition
 * @internal
 * @param item Source object
 * @param omitKeyFn Function that receives key and returns whether to exclude (true to exclude)
 * @returns New object with keys matching condition excluded
 * @example
 * const data = { name: "Alice", _internal: "secret", age: 30 };
 * objOmitByFilter(data, (key) => key.startsWith("_"));
 * // { name: "Alice", age: 30 }
 */
export function objOmitByFilter<T extends Record<string, unknown>>(
  item: T,
  omitKeyFn: (key: keyof T) => boolean,
): T {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(item)) {
    if (!omitKeyFn(key)) {
      result[key] = item[key];
    }
  }
  return result as T;
}

/**
 * Select specific keys from object
 * @param item Source object
 * @param keys Array of keys to select
 * @returns New object containing only specified keys
 * @example
 * const user = { name: "Alice", age: 30, email: "alice@example.com" };
 * objPick(user, ["name", "age"]);
 * // { name: "Alice", age: 30 }
 */
export function objPick<T extends Record<string, unknown>, K extends keyof T>(
  item: T,
  keys: K[],
): Pick<T, K> {
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    result[key as string] = item[key];
  }
  return result as Pick<T, K>;
}

//#endregion

//#region objGetChainValue / objSetChainValue / objDeleteChainValue

// Regex caching (created once at module load)
const chainSplitRegex = /[.[\]]/g;
const chainCleanRegex = /[?!'"]/g;
const chainNumericRegex = /^[0-9]*$/;

function getChainSplits(chain: string): (string | number)[] {
  const split = chain
    .split(chainSplitRegex)
    .map((item) => item.replace(chainCleanRegex, ""))
    .filter((item) => Boolean(item));
  const result: (string | number)[] = [];
  for (const splitItem of split) {
    if (chainNumericRegex.test(splitItem)) {
      result.push(Number.parseInt(splitItem));
    } else {
      result.push(splitItem);
    }
  }

  return result;
}

/**
 * Get value by chain path
 * @example objGetChainValue(obj, "a.b[0].c")
 */
export function objGetChainValue(obj: unknown, chain: string, optional: true): unknown | undefined;
export function objGetChainValue(obj: unknown, chain: string): unknown;
export function objGetChainValue(
  obj: unknown,
  chain: string,
  optional?: true,
): unknown | undefined {
  const splits = getChainSplits(chain);
  let result: unknown = obj;
  for (const splitItem of splits) {
    if (optional && result === undefined) {
      result = undefined;
    } else {
      result = (result as Record<string | number, unknown>)[splitItem];
    }
  }
  return result;
}

/**
 * Descend by the same key for depth levels
 * @internal
 * @param obj Target object
 * @param key Key to descend by
 * @param depth Depth to descend (1 or more)
 * @param optional If true, return undefined without error if null/undefined found in the middle
 * @throws ArgumentError If depth is less than 1
 * @example objGetChainValueByDepth({ parent: { parent: { name: 'a' } } }, 'parent', 2) => { name: 'a' }
 */
export function objGetChainValueByDepth<TObject, TKey extends keyof TObject>(
  obj: TObject,
  key: TKey,
  depth: number,
  optional: true,
): TObject[TKey] | undefined;
export function objGetChainValueByDepth<TObject, TKey extends keyof TObject>(
  obj: TObject,
  key: TKey,
  depth: number,
): TObject[TKey];
export function objGetChainValueByDepth<TObject, TKey extends keyof TObject>(
  obj: TObject,
  key: TKey,
  depth: number,
  optional?: true,
): TObject[TKey] | undefined {
  if (depth < 1) {
    throw new ArgumentError("depth must be 1 or greater", { depth });
  }
  let result: unknown = obj;
  for (let i = 0; i < depth; i++) {
    if (optional && result == null) {
      result = undefined;
    } else {
      result = (result as Record<string, unknown>)[key as string];
    }
  }
  return result as TObject[TKey] | undefined;
}

/**
 * Set value by chain path
 * @example objSetChainValue(obj, "a.b[0].c", value)
 */
export function objSetChainValue(obj: unknown, chain: string, value: unknown): void {
  const splits = getChainSplits(chain);
  if (splits.length === 0) {
    throw new ArgumentError("Chain is empty", { chain });
  }

  let curr: Record<string | number, unknown> = obj as Record<string | number, unknown>;
  for (const splitItem of splits.slice(0, -1)) {
    curr[splitItem] = curr[splitItem] ?? {};
    curr = curr[splitItem] as Record<string | number, unknown>;
  }

  const last = splits[splits.length - 1];
  curr[last] = value;
}

/**
 * Delete value by chain path
 * @example objDeleteChainValue(obj, "a.b[0].c")
 */
export function objDeleteChainValue(obj: unknown, chain: string): void {
  const splits = getChainSplits(chain);
  if (splits.length === 0) {
    throw new ArgumentError("Chain is empty", { chain });
  }

  let curr: Record<string | number, unknown> = obj as Record<string | number, unknown>;
  for (const splitItem of splits.slice(0, -1)) {
    const next = curr[splitItem];
    // Silently return if middle path doesn't exist (nothing to delete)
    if (next == null || typeof next !== "object") {
      return;
    }
    curr = next as Record<string | number, unknown>;
  }

  const last = splits[splits.length - 1];
  delete curr[last];
}

//#endregion

//#region objClearUndefined / objClear / objNullToUndefined / objUnflatten

/**
 * Delete keys with undefined values from object
 * @internal
 *
 * @mutates Modifies the original object directly
 */
export function objClearUndefined<T extends object>(obj: T): T {
  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (record[key] === undefined) {
      delete record[key];
    }
  }
  return obj;
}

/**
 * Delete all keys from object
 * @internal
 *
 * @mutates Modifies the original object directly
 */
export function objClear<T extends Record<string, unknown>>(obj: T): Record<string, never> {
  for (const key of Object.keys(obj)) {
    delete obj[key];
  }
  return obj as Record<string, never>;
}

/**
 * Convert null to undefined (recursive)
 * @internal
 *
 * @mutates Modifies the original array/object directly
 */
export function objNullToUndefined<TObject>(obj: TObject): TObject | undefined {
  return objNullToUndefinedImpl(obj, new WeakSet());
}

function objNullToUndefinedImpl<TObject>(obj: TObject, seen: WeakSet<object>): TObject | undefined {
  if (obj == null) {
    return undefined;
  }

  if (
    obj instanceof Date ||
    obj instanceof DateTime ||
    obj instanceof DateOnly ||
    obj instanceof Time ||
    obj instanceof Uuid
  ) {
    return obj;
  }

  if (obj instanceof Array) {
    if (seen.has(obj)) return obj;
    seen.add(obj);
    for (let i = 0; i < obj.length; i++) {
      obj[i] = objNullToUndefinedImpl(obj[i], seen);
    }
    return obj;
  }

  if (typeof obj === "object") {
    if (seen.has(obj as object)) return obj;
    seen.add(obj as object);
    const objRec = obj as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      objRec[key] = objNullToUndefinedImpl(objRec[key], seen);
    }

    return obj;
  }

  return obj;
}

/**
 * Convert flattened object to nested object
 * @internal
 * @example objUnflatten({ "a.b.c": 1 }) => { a: { b: { c: 1 } } }
 */
export function objUnflatten(flatObj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key in flatObj) {
    const parts = key.split(".");
    let current: Record<string, unknown> = result;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (i === parts.length - 1) {
        current[part] = flatObj[key];
      } else {
        if (!(part in current)) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }
    }
  }

  return result;
}

//#endregion

//#region Type utilities

/**
 * Convert properties with undefined to optional
 * @example { a: string; b: string | undefined } → { a: string; b?: string | undefined }
 */
export type ObjUndefToOptional<TObject> = {
  [K in keyof TObject as undefined extends TObject[K] ? K : never]?: TObject[K];
} & { [K in keyof TObject as undefined extends TObject[K] ? never : K]: TObject[K] };

/**
 * Convert optional properties to required + undefined union
 * @example { a: string; b?: string } → { a: string; b: string | undefined }
 */
export type ObjOptionalToUndef<TObject> = {
  [K in keyof TObject]-?: {} extends Pick<TObject, K> ? TObject[K] | undefined : TObject[K];
};

//#endregion

/**
 * Type-safe version of Object.keys
 * @param obj Object to extract keys from
 * @returns Array of object keys
 */
export function objKeys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

/**
 * Type-safe version of Object.entries
 * @param obj Object to extract entries from
 * @returns Array of [key, value] tuples
 */
export function objEntries<T extends object>(obj: T): ObjEntries<T> {
  return Object.entries(obj) as ObjEntries<T>;
}

/**
 * Type-safe version of Object.fromEntries
 * @param entries Array of [key, value] tuples
 * @returns Created object
 */
export function objFromEntries<T extends [string, unknown]>(entries: T[]): { [K in T[0]]: T[1] } {
  return Object.fromEntries(entries) as { [K in T[0]]: T[1] };
}

type ObjEntries<TObject> = { [K in keyof TObject]: [K, TObject[K]] }[keyof TObject][];

/**
 * Transform each entry of object and return new object
 * @param obj Object to transform
 * @param fn Transform function (key, value) => [newKey, newValue]
 * @returns New object with transformed keys and values
 * @example
 * const colors = { primary: "255, 0, 0", secondary: "0, 255, 0" };
 *
 * // Transform only values
 * objMap(colors, (key, rgb) => [null, `rgb(${rgb})`]);
 * // { primary: "rgb(255, 0, 0)", secondary: "rgb(0, 255, 0)" }
 *
 * // Transform both keys and values
 * objMap(colors, (key, rgb) => [`${key}Light`, `rgb(${rgb})`]);
 * // { primaryLight: "rgb(255, 0, 0)", secondaryLight: "rgb(0, 255, 0)" }
 */
export function objMap<TSource extends object, TNewKey extends string, TNewValue>(
  obj: TSource,
  fn: (key: keyof TSource, value: TSource[keyof TSource]) => [TNewKey | null, TNewValue],
): Record<TNewKey | Extract<keyof TSource, string>, TNewValue> {
  return objMapImpl(obj, fn);
}

function objMapImpl<TSource extends object, TNewKey extends string, TNewValue>(
  obj: TSource,
  fn: (key: keyof TSource, value: TSource[keyof TSource]) => [TNewKey | null, TNewValue],
): Record<string, TNewValue> {
  const result: Record<string, TNewValue> = {};
  for (const key of Object.keys(obj)) {
    const [newKey, newValue] = fn(
      key as keyof TSource,
      (obj as Record<string, TSource[keyof TSource]>)[key],
    );
    result[newKey ?? key] = newValue;
  }
  return result;
}
