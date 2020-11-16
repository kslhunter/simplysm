export class NumberUtil {
  public static parseInt(text: string | undefined, radix: number = 10): number | undefined {
    const txt = text?.replace(/,/g, "");
    if (txt === undefined) return undefined;
    const result = Number.parseInt(txt, radix);
    if (Number.isNaN(result)) return undefined;
    return result;
  }
}
