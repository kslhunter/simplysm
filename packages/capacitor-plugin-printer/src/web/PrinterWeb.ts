import { WebPlugin } from "@capacitor/core";
import type { PrinterPlugin } from "../PrinterPlugin";

export class PrinterWeb extends WebPlugin implements PrinterPlugin {
  async printText(_options: { lines: string[] }): Promise<void> {
    // 웹에서는 동작 없음
  }
}
