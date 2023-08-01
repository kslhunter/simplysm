import { SdExcelCell } from "./SdExcelCell";
import { SdExcelXmlWorksheet } from "./files/SdExcelXmlWorksheet";
import { SdExcelZipCache } from "./utils/SdExcelZipCache";

export class SdExcelRow {
  private readonly _cellMap = new Map<number, SdExcelCell>();

  public constructor(private readonly _zipCache: SdExcelZipCache,
                     private readonly _targetFileName: string,
                     private readonly _r: number) {
  }

  public cell(c: number): SdExcelCell {
    return this._cellMap.getOrCreate(c, new SdExcelCell(this._zipCache, this._targetFileName, this._r, c));
  }

  public async getCellsAsync(): Promise<SdExcelCell[]> {
    const result: SdExcelCell[] = [];

    const wsData = await this._getWsDataAsync();

    const range = wsData.range;
    for (let c = range.s.c; c <= range.e.c; c++) {
      result[c] = this.cell(c);
    }

    return result;
  }

  private async _getWsDataAsync(): Promise<SdExcelXmlWorksheet> {
    return await this._zipCache.getAsync(`xl/worksheets/${this._targetFileName}`) as SdExcelXmlWorksheet;
  }
}
