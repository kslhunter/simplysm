import { registerPlugin } from "@capacitor/core";
import type { PrinterPlugin } from "./PrinterPlugin";

const printerPlugin = registerPlugin<PrinterPlugin>("Printer", {
  web: async () => {
    const { PrinterWeb } = await import("./web/PrinterWeb");
    return new PrinterWeb();
  },
});

/**
 * PM500 영수증 프린터 플러그인
 * - 텍스트 라인 기반 영수증 인쇄
 */
export abstract class Printer {
  /**
   * 텍스트 라인 목록을 영수증으로 인쇄
   *
   * @example
   * ```ts
   * await Printer.printText(["주문번호: 001", "상품: 커피", "금액: 3,000원"]);
   * ```
   */
  static async printText(lines: string[]): Promise<void> {
    await printerPlugin.printText({ lines });
  }
}
