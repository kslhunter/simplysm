export interface PrinterPlugin {
  printText(options: { lines: string[] }): Promise<void>;
}
