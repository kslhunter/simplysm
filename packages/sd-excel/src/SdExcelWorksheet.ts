import { SdExcelXmlWorksheet } from "./files/SdExcelXmlWorksheet";
import { SdExcelZipCache } from "./utils/SdExcelZipCache";
import { ISdExcelAddressRangePoint } from "./commons";
import { SdExcelRow } from "./SdExcelRow";
import { SdExcelCell } from "./SdExcelCell";

export class SdExcelWorksheet {
  private readonly _rowMap = new Map<number, SdExcelRow>();

  public constructor(private readonly _zipCache: SdExcelZipCache,
                     private readonly _relId: number) {
  }

  public row(r: number): SdExcelRow {
    return this._rowMap.getOrCreate(r, new SdExcelRow(this._zipCache, this._relId, r));
  }

  public cell(r: number, c: number): SdExcelCell {
    return this.row(r).cell(c);
  }

  public async getRangeAsync(): Promise<ISdExcelAddressRangePoint> {
    const xml = await this._getDataAsync();
    return xml.range;
  }

  public async getCellsAsync(): Promise<SdExcelCell[][]> {
    const result: SdExcelCell[][] = [];

    const xml = await this._getDataAsync();

    const range = xml.range;
    for (let r = range.s.r; r <= range.e.r; r++) {
      const cells = await this.row(r).getCellsAsync();
      result.push(cells);
    }

    return result;
  }

  private async _getDataAsync(): Promise<SdExcelXmlWorksheet> {
    return await this._zipCache.getAsync(`xl/worksheets/sheet${this._relId}.xml`) as SdExcelXmlWorksheet;
  }
}
