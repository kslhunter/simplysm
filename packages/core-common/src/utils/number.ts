/**
 * 숫자 유틸리티
 */
export class NumberUtils {
  //#region 파싱
  /**
   * 문자열을 정수로 파싱
   * 숫자가 아닌 문자는 제거 후 파싱
   */
  static parseInt(text: unknown, radix: number = 10): number | undefined {
    if (typeof text === "number") return Math.round(text);
    if (typeof text !== "string") return undefined;
    const txt = text.replace(/[^0-9.\-]/g, "").trim();
    if (txt === "") return undefined;
    const result = Number.parseInt(txt, radix);
    if (Number.isNaN(result)) return undefined;
    return result;
  }

  /**
   * 문자열을 실수로 파싱 후 반올림하여 정수 반환
   */
  static parseRoundedInt(text: unknown): number | undefined {
    const float = this.parseFloat(text);
    return float !== undefined ? Math.round(float) : undefined;
  }

  /**
   * 문자열을 실수로 파싱
   * 숫자가 아닌 문자는 제거 후 파싱
   */
  static parseFloat(text: unknown): number | undefined {
    if (typeof text === "number") return text;
    if (typeof text !== "string") return undefined;
    const txt = text.replace(/[^0-9.\-]/g, "").trim();
    if (txt === "") return undefined;
    const result = Number.parseFloat(txt);
    if (Number.isNaN(result)) return undefined;
    return result;
  }
  //#endregion

  //#region 체크
  /**
   * null, undefined, 0 체크
   */
  static isNullOrEmpty(
    val: number | null | undefined,
  ): val is 0 | undefined | null {
    return val == null || val === 0;
  }
  //#endregion

  //#region 포맷팅
  /**
   * 숫자를 천단위 구분자가 포함된 문자열로 포맷팅
   */
  static format(
    val: number,
    digit?: { max?: number; min?: number },
  ): string;
  static format(
    val: number | undefined,
    digit?: { max?: number; min?: number },
  ): string | undefined;
  static format(
    val: number | undefined,
    digit?: { max?: number; min?: number },
  ): string | undefined {
    return val?.toLocaleString(undefined, {
      maximumFractionDigits: digit?.max,
      minimumFractionDigits: digit?.min,
    });
  }
  //#endregion
}
