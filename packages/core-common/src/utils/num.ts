/**
 * Number utility functions
 */

//#region numParseInt / numParseFloat / numParseRoundedInt

/**
 * Parse string to integer
 * Remove non-numeric characters (except 0-9, -, .) before parsing
 *
 * @note Strings with decimal points return only the integer part (e.g., '12.34' → 12).
 *       Use {@link numParseRoundedInt} if rounding is needed.
 * @note Hyphens (-) in the middle of the string are preserved, which may result in unintended negative numbers.
 *       Example: `"가-123나"` → `-123`
 */
export function numParseInt(text: unknown): number | undefined {
  if (typeof text === "number") return Math.trunc(text);
  if (typeof text !== "string") return undefined;
  const txt = text.replace(/[^0-9.\-]/g, "").trim();
  if (txt === "") return undefined;
  const result = Number.parseInt(txt, 10);
  if (Number.isNaN(result)) return undefined;
  return result;
}

/**
 * Parse string to float, then round and return integer
 */
export function numParseRoundedInt(text: unknown): number | undefined {
  const float = numParseFloat(text);
  return float !== undefined ? Math.round(float) : undefined;
}

/**
 * Parse string to float
 * Remove non-numeric characters before parsing
 */
export function numParseFloat(text: unknown): number | undefined {
  if (typeof text === "number") return text;
  if (typeof text !== "string") return undefined;
  const txt = text.replace(/[^0-9.\-]/g, "").trim();
  if (txt === "") return undefined;
  const result = Number.parseFloat(txt);
  if (Number.isNaN(result)) return undefined;
  return result;
}

//#endregion

//#region numIsNullOrEmpty

/**
 * Check undefined, null, 0 (type guard)
 *
 * Acts as a type guard, guaranteeing that if true is returned, `val` is `0 | undefined`.
 * If false is returned, `val` is guaranteed to be a valid non-zero number.
 *
 * @param val Value to check
 * @returns true if undefined, null, or 0
 * @example
 * const count: number | undefined = getValue();
 * if (numIsNullOrEmpty(count)) {
 *   // count: 0 | undefined
 *   console.log("Empty");
 * } else {
 *   // count: number (non-zero value)
 *   console.log(`Count: ${count}`);
 * }
 */
export function numIsNullOrEmpty(val: number | undefined): val is 0 | undefined {
  return val == null || val === 0;
}

//#endregion

//#region numFormat

/**
 * Format number to string with thousand separators
 * @param val Number to format
 * @param digit Decimal place options
 * @param digit.max Maximum decimal places
 * @param digit.min Minimum decimal places (pad with 0 if insufficient)
 * @example
 * numFormat(1234.567, { max: 2 }) // "1,234.57"
 * numFormat(1234, { min: 2 }) // "1,234.00"
 */
export function numFormat(val: number, digit?: { max?: number; min?: number }): string;
export function numFormat(
  val: number | undefined,
  digit?: { max?: number; min?: number },
): string | undefined;
export function numFormat(
  val: number | undefined,
  digit?: { max?: number; min?: number },
): string | undefined {
  return val?.toLocaleString(undefined, {
    maximumFractionDigits: digit?.max,
    minimumFractionDigits: digit?.min,
  });
}

//#endregion
