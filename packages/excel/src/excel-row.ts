import type { ExcelCell } from "./excel-cell";
import type { ExcelXmlWorksheet } from "./xml/excel-xml-worksheet";
import type { ZipCache } from "./utils/zip-cache";

/** Excel 워크시트의 행을 나타내는 클래스. 셀 접근 기능을 제공한다. */
export class ExcelRow {
  constructor(
    private readonly _zipCache: ZipCache,
    private readonly _targetFileName: string,
    private readonly _r: number,
    private readonly _cellFactory: (c: number) => ExcelCell,
  ) {}

  /** 지정된 열 인덱스의 셀 반환 (0 기반) */
  cell(c: number): ExcelCell {
    return this._cellFactory(c);
  }

  /** 행의 모든 셀 반환 */
  async getCells(): Promise<ExcelCell[]> {
    const result: ExcelCell[] = [];
    const wsData = await this._getWsData();
    const range = wsData.range;

    for (let c = range.s.c; c <= range.e.c; c++) {
      result[c] = this.cell(c);
    }

    return result;
  }

  private async _getWsData(): Promise<ExcelXmlWorksheet> {
    return (await this._zipCache.get(`xl/worksheets/${this._targetFileName}`)) as ExcelXmlWorksheet;
  }
}
