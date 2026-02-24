import type { ExcelXml } from "../types";

/**
 * Class preserving Excel XML data of unknown format.
 * Maintains original data without loss.
 */
export class ExcelXmlUnknown implements ExcelXml {
  constructor(public readonly data: Record<string, unknown>) {}

  cleanup(): void {}
}
