import "@simplysm/core-common";
import { ExcelCell } from "./excel-cell";
import type { ExcelXmlWorksheet } from "./xml/excel-xml-worksheet";
import type { ZipCache } from "./utils/zip-cache";

/** Excel 워크시트의 열을 나타내는 클래스. 셀 접근 및 열 너비 설정 기능을 제공한다. */
export class ExcelCol {
  private readonly _cellMap = new Map<number, ExcelCell>();

  constructor(
    private readonly _zipCache: ZipCache,
    private readonly _targetFileName: string,
    private readonly _c: number,
  ) {}

  /** 행 인덱스에 해당하는 셀 반환 (0-based) */
  cell(r: number): ExcelCell {
    return this._cellMap.getOrCreate(
      r,
      new ExcelCell(this._zipCache, this._targetFileName, r, this._c),
    );
  }

  /** 열의 모든 셀 반환 */
  async getCells(): Promise<ExcelCell[]> {
    const result: ExcelCell[] = [];
    const wsData = await this._getWsData();
    const range = wsData.range;

    for (let r = range.s.r; r <= range.e.r; r++) {
      result[r] = this.cell(r);
    }

    return result;
  }

  /** 열 너비 설정 */
  async setWidth(size: number): Promise<void> {
    const wsData = await this._getWsData();
    wsData.setColWidth((this._c + 1).toString(), size.toString());
  }

  private async _getWsData(): Promise<ExcelXmlWorksheet> {
    return (await this._zipCache.get(`xl/worksheets/${this._targetFileName}`)) as ExcelXmlWorksheet;
  }
}
