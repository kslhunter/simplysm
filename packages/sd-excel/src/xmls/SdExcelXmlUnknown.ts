import type { ISdExcelXml } from "../types";

export class SdExcelXmlUnknown implements ISdExcelXml {
  constructor(public readonly data: Record<string, any>) {
  }

  cleanup(): void {
  }
}
