import type { ExcelCell } from "./excel-cell";
import type { IWorksheetModel } from "./models/i-worksheet-model";
import type { ZipCache } from "./utils/zip-cache";

/** Excel 워크시트의 열을 나타내는 클래스. 셀 접근 및 열 너비 설정 기능을 제공한다. */
export class ExcelCol {
  constructor(
    private readonly _zipCache: ZipCache,
    private readonly _targetFileName: string,
    private readonly _c: number,
    private readonly _cellFactory: (r: number) => ExcelCell,
  ) {}

  /** 지정된 행 인덱스의 셀 반환 (0 기반) */
  cell(r: number): ExcelCell {
    return this._cellFactory(r);
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

  private async _getWsData(): Promise<IWorksheetModel> {
    return (await this._zipCache.get(`xl/worksheets/${this._targetFileName}`)) as IWorksheetModel;
  }
}
