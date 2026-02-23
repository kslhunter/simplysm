export class NumberUtils {
  static parseInt(text: any, radix: number = 10): number | undefined {
    if (typeof text === "number") return Math.round(text);
    const txt = text?.replace(/[^0-9.\-]/g, "")?.trim();
    if (txt === undefined) return undefined;
    const result = Number.parseInt(txt, radix);
    if (Number.isNaN(result)) return undefined;
    return result;
  }

  static parseRoundedInt(text: any): number | undefined {
    const float = this.parseFloat(text);
    return float !== undefined ? Math.round(float) : undefined;
  }

  static parseFloat(text: any): number | undefined {
    if (typeof text === "number") return text;
    const txt = text?.replace(/[^0-9.\-]/g, "")?.trim();
    if (txt === undefined) return undefined;
    const result = Number.parseFloat(txt);
    if (Number.isNaN(result)) return undefined;
    return result;
  }

  static isNullOrEmpty(val: number | null | undefined): val is 0 | undefined | null {
    return val == null || val === 0;
  }

  static format(val: number, digit?: { max?: number; min?: number }): string;
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
}
