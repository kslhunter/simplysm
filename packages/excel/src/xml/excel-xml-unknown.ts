import type { ExcelXml } from "../types";

export class ExcelXmlUnknown implements ExcelXml {
  constructor(public readonly data: Record<string, unknown>) {}

  cleanup(): void {}
}
