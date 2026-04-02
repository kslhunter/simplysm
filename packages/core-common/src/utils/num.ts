/**
 * 숫자 유틸리티 함수
 */

//#region parseInt / parseFloat / parseRoundedInt

/**
 * 문자열을 정수로 파싱
 * 파싱 전 비숫자 문자(0-9, -, . 제외) 제거
 *
 * @note 소수점이 있는 문자열은 정수 부분만 반환 (예: '12.34' → 12).
 *       반올림이 필요하면 {@link parseRoundedInt} 사용.
 * @note 선행 하이픈(-)만 음수 부호로 유지하고, 중간 하이픈은 제거한다.
 *       예: `"-123"` → `-123`, `"010-1234-5678"` → `1012345678`
 */
export function parseInt(text: unknown): number | undefined {
  if (typeof text === "number") return Math.trunc(text);
  if (typeof text !== "string") return undefined;
  const stripped = text.replace(/[^0-9.\-]/g, "");
  const txt = (stripped.startsWith("-") ? "-" : "") + stripped.replace(/-/g, "");
  if (txt === "" || txt === "-") return undefined;
  const result = Number.parseInt(txt, 10);
  if (Number.isNaN(result)) return undefined;
  return result;
}

/**
 * 문자열을 float로 파싱한 후 반올림하여 정수 반환
 */
export function parseRoundedInt(text: unknown): number | undefined {
  const float = parseFloat(text);
  return float !== undefined ? Math.round(float) : undefined;
}

/**
 * 문자열을 float로 파싱
 * 파싱 전 비숫자 문자 제거
 */
export function parseFloat(text: unknown): number | undefined {
  if (typeof text === "number") return text;
  if (typeof text !== "string") return undefined;
  const stripped = text.replace(/[^0-9.\-]/g, "");
  const txt = (stripped.startsWith("-") ? "-" : "") + stripped.replace(/-/g, "");
  if (txt === "" || txt === "-") return undefined;
  const result = Number.parseFloat(txt);
  if (Number.isNaN(result)) return undefined;
  return result;
}

//#endregion

//#region isNullOrEmpty

/**
 * undefined, null, 0 검사 (타입 가드)
 *
 * 타입 가드로 동작하여, true를 반환하면 `val`이 `0 | undefined`임을 보장.
 * false를 반환하면 `val`이 유효한 0이 아닌 숫자임을 보장.
 *
 * @param val 검사할 값
 * @returns undefined, null, 또는 0이면 true
 * @example
 * const count: number | undefined = getValue();
 * if (isNullOrEmpty(count)) {
 *   // count: 0 | undefined
 *   console.log("Empty");
 * } else {
 *   // count: number (non-zero value)
 *   console.log(`Count: ${count}`);
 * }
 */
export function isNullOrEmpty(val: number | undefined): val is 0 | undefined {
  return val == null || val === 0;
}

//#endregion

//#region format

/**
 * 숫자를 천 단위 구분자가 포함된 문자열로 포맷
 * @param val 포맷할 숫자
 * @param digit 소수점 옵션
 * @param digit.max 최대 소수점 자릿수
 * @param digit.min 최소 소수점 자릿수 (부족하면 0으로 채움)
 * @example
 * format(1234.567, { max: 2 }) // "1,234.57"
 * format(1234, { min: 2 }) // "1,234.00"
 */
export function format(val: number, digit?: { max?: number; min?: number }): string;
export function format(
  val: number | undefined,
  digit?: { max?: number; min?: number },
): string | undefined;
export function format(
  val: number | undefined,
  digit?: { max?: number; min?: number },
): string | undefined {
  return val?.toLocaleString(undefined, {
    maximumFractionDigits: digit?.max,
    minimumFractionDigits: digit?.min,
  });
}

//#endregion
