import { SdExcelCell } from "./SdExcelCell";
import type { SdExcelXmlWorksheet } from "./xmls/SdExcelXmlWorksheet";
import type { ZipCache } from "./utils/ZipCache";

export class SdExcelRow {
  private readonly _cellMap = new Map<number, SdExcelCell>();

  constructor(
    private readonly _zipCache: ZipCache,
    private readonly _targetFileName: string,
    private readonly _r: number,
  ) {}

  cell(c: number): SdExcelCell {
    return this._cellMap.getOrCreate(
      c,
      new SdExcelCell(this._zipCache, this._targetFileName, this._r, c),
    );
  }

  async getCellsAsync(): Promise<SdExcelCell[]> {
    const result: SdExcelCell[] = [];

    const wsData = await this._getWsDataAsync();

    const range = wsData.range;
    for (let c = range.s.c; c <= range.e.c; c++) {
      result[c] = this.cell(c);
    }

    return result;
  }

  private async _getWsDataAsync() {
    return (await this._zipCache.getAsync(
      `xl/worksheets/${this._targetFileName}`,
    )) as SdExcelXmlWorksheet;
  }
}
