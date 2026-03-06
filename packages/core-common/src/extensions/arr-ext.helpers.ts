/**
 * Array extension helper functions
 */

import { DateTime } from "../types/date-time";
import { DateOnly } from "../types/date-only";
import { Time } from "../types/time";
import { ArgumentError } from "../errors/argument-error";
import { equal } from "../utils/obj";
import type { ComparableType } from "./arr-ext.types";

/**
 * Convert DateTime, DateOnly, Time to comparable primitive values
 */
export function toComparable(value: ComparableType): string | number | boolean | undefined {
  if (value instanceof DateOnly || value instanceof DateTime || value instanceof Time) {
    return value.tick;
  }
  return value;
}

/**
 * Comparison function for sorting
 *
 * @param pp comparison target 1
 * @param pn comparison target 2
 * @param desc true: descending, false: ascending
 * @returns negative: pp comes first, 0: equal, positive: pn comes first
 * @note null/undefined values are sorted first in ascending, last in descending
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
    // true > false: true comes last in ascending, first in descending
    return cpn ? (desc ? 1 : -1) : desc ? -1 : 1;
  }

  throw new ArgumentError("Cannot use orderBy with this type.", {
    type1: typeof cpp,
    type2: typeof cpn,
  });
}

/**
 * Returns a Set of indices to KEEP (i.e., first occurrence of each unique item).
 * Handles all deduplication strategies: matchAddress, keyFn, and default type-based.
 */
export function getDistinctIndices<TItem>(
  items: readonly TItem[],
  options?: boolean | { matchAddress?: boolean; keyFn?: (item: TItem) => string | number },
): Set<number> {
  const opts = typeof options === "boolean" ? { matchAddress: options } : (options ?? {});
  const result = new Set<number>();

  // matchAddress: Set-based O(n)
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

  // keyFn provided: custom key-based O(n)
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

  // Default: type-based processing with edge cases
  const seen = new Map<string, TItem>();
  const seenRefs = new Set<symbol | ((...args: unknown[]) => unknown)>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item === null || typeof item !== "object") {
      const type = typeof item;

      if (type === "symbol" || type === "function") {
        if (!seenRefs.has(item)) {
          seenRefs.add(item);
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

    // Objects: deep comparison (O(n²) — only add if no duplicate found in already-kept items)
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
