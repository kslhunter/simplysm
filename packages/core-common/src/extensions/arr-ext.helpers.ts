/**
 * Array extension helper functions
 */

import { DateTime } from "../types/date-time";
import { DateOnly } from "../types/date-only";
import { Time } from "../types/time";
import { ArgumentError } from "../errors/argument-error";
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
