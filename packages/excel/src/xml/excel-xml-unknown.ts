import type { ExcelXml } from "../types";

/**
 * 알 수 없는 형식의 Excel XML 데이터를 보존하는 클래스.
 * 원본 데이터를 손실 없이 유지한다.
 */
export class ExcelXmlUnknown implements ExcelXml {
  constructor(public readonly data: Record<string, unknown>) {}

  cleanup(): void {}
}
