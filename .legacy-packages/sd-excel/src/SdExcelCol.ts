import { SdExcelCell } from "./SdExcelCell";
import type { SdExcelXmlWorksheet } from "./xmls/SdExcelXmlWorksheet";
import type { ZipCache } from "./utils/ZipCache";

export class SdExcelCol {
  private readonly _cellMap = new Map<number, SdExcelCell>();

  constructor(
    private readonly _zipCache: ZipCache,
    private readonly _targetFileName: string,
    private readonly _c: number,
  ) {}

  cell(r: number): SdExcelCell {
    return this._cellMap.getOrCreate(
      r,
      new SdExcelCell(this._zipCache, this._targetFileName, r, this._c),
    );
  }

  async getCellsAsync(): Promise<SdExcelCell[]> {
    const result: SdExcelCell[] = [];

    const wsData = await this._getWsDataAsync();

    const range = wsData.range;
    for (let r = range.s.r; r <= range.e.r; r++) {
      result[r] = this.cell(r);
    }

    return result;
  }

  async setWidthAsync(size: number) {
    const wsData = await this._getWsDataAsync();
    wsData.setColWidth((this._c + 1).toString(), size.toString());
  }

  private async _getWsDataAsync(): Promise<SdExcelXmlWorksheet> {
    return (await this._zipCache.getAsync(
      `xl/worksheets/${this._targetFileName}`,
    )) as SdExcelXmlWorksheet;
  }
}
