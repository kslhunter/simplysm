import { ISdExcelXml } from "../types";

export class SdExcelXmlUnknown implements ISdExcelXml {
  constructor(public data: Record<string, any>) {
  }

  cleanup(): void {
  }
}
