import type { Bytes } from "@simplysm/core-common";
import { xml as xmlU } from "@simplysm/core-common";
import type { IExcelModel } from "../models/excel-model";

/**
 * 알 수 없는 형식의 Excel XML 데이터를 보존하는 클래스.
 * 원본 데이터를 손실 없이 유지한다.
 */
export class ExcelXmlUnknown implements IExcelModel {
  constructor(private readonly _data: Record<string, unknown>) {}

  serialize(): Bytes {
    return new TextEncoder().encode(xmlU.stringify(this._data));
  }
}
