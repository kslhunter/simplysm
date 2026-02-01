/**
 * 숫자 유틸리티 함수
 */
/**
 * 문자열을 정수로 파싱
 * 숫자가 아닌 문자(0-9, -, . 제외)는 제거 후 파싱
 *
 * @note 소수점이 포함된 문자열은 정수 부분만 반환됩니다 (예: '12.34' → 12).
 *       반올림이 필요하면 {@link numParseRoundedInt}를 사용하세요.
 * @note 문자열 중간의 `-`도 유지되므로 의도치 않은 음수가 될 수 있습니다.
 *       예: `"가-123나"` → `-123`
 */
export declare function numParseInt(text: unknown): number | undefined;
/**
 * 문자열을 실수로 파싱 후 반올림하여 정수 반환
 */
export declare function numParseRoundedInt(text: unknown): number | undefined;
/**
 * 문자열을 실수로 파싱
 * 숫자가 아닌 문자는 제거 후 파싱
 */
export declare function numParseFloat(text: unknown): number | undefined;
/**
 * undefined, null, 0 체크 (타입 가드)
 *
 * 타입 가드로 동작하여, true 반환 시 `val`이 `0 | undefined`임을 보장합니다.
 * false 반환 시 `val`이 0이 아닌 유효한 숫자임이 보장됩니다.
 *
 * @param val 체크할 값
 * @returns undefined, null, 0이면 true
 * @example
 * const count: number | undefined = getValue();
 * if (numIsNullOrEmpty(count)) {
 *   // count: 0 | undefined
 *   console.log("비어있음");
 * } else {
 *   // count: number (0이 아닌 값)
 *   console.log(`개수: ${count}`);
 * }
 */
export declare function numIsNullOrEmpty(val: number | undefined): val is 0 | undefined;
/**
 * 숫자를 천단위 구분자가 포함된 문자열로 포맷팅
 * @param val 포맷팅할 숫자
 * @param digit 소수점 자릿수 옵션
 * @param digit.max 최대 소수점 자릿수
 * @param digit.min 최소 소수점 자릿수 (부족하면 0으로 채움)
 * @example
 * numFormat(1234.567, { max: 2 }) // "1,234.57"
 * numFormat(1234, { min: 2 }) // "1,234.00"
 */
export declare function numFormat(val: number, digit?: {
    max?: number;
    min?: number;
}): string;
export declare function numFormat(val: number | undefined, digit?: {
    max?: number;
    min?: number;
}): string | undefined;
//# sourceMappingURL=num.d.ts.map