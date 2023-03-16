import { SdExcelXmlWorksheet } from "./files/SdExcelXmlWorksheet";
import { SdExcelZipCache } from "./utils/SdExcelZipCache";
import { ISdExcelAddressRangePoint, TSdExcelValueType } from "./commons";
import { SdExcelRow } from "./SdExcelRow";
import { SdExcelCell } from "./SdExcelCell";
import { SdExcelXmlWorkbook } from "./files/SdExcelXmlWorkbook";
import { SdExcelCol } from "./SdExcelCol";

export class SdExcelWorksheet {
  private readonly _rowMap = new Map<number, SdExcelRow>();

  public constructor(private readonly _zipCache: SdExcelZipCache,
                     private readonly _relId: number) {
  }

  public async getNameAsync(): Promise<string> {
    const wbXmlData = await this._getWbDataAsync();
    return wbXmlData.getWorksheetNameById(this._relId)!;
  }

  public row(r: number): SdExcelRow {
    return this._rowMap.getOrCreate(r, new SdExcelRow(this._zipCache, this._relId, r));
  }

  public cell(r: number, c: number): SdExcelCell {
    return this.row(r).cell(c);
  }

  public col(c: number): SdExcelCol {
    return new SdExcelCol(this._zipCache, this._relId, c);
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

  public async getDataTableAsync(opt?: { headerRowIndex?: number; checkEndColIndex?: number; usableHeaderNameFn?: (headerName: string) => boolean }): Promise<Record<string, any>[]> {
    const result: Record<string, TSdExcelValueType>[] = [];

    const headerMap = new Map<string, number>();

    const xml = await this._getDataAsync();
    const range = xml.range;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const headerName = await this.cell(opt?.headerRowIndex ?? range.s.r, c).getValAsync();
      if (typeof headerName === "string") {
        if (!opt?.usableHeaderNameFn || opt.usableHeaderNameFn(headerName)) {
          headerMap.set(headerName, c);
        }
      }
    }

    for (let r = (opt?.headerRowIndex ?? range.s.r) + 1; r <= range.e.r; r++) {
      if (opt?.checkEndColIndex !== undefined && await this.cell(r, opt.checkEndColIndex).getValAsync() === undefined) {
        break;
      }

      const record: Record<string, TSdExcelValueType> = {} as any;
      for (const header of headerMap.keys()) {
        const c = headerMap.get(header)!;
        record[header] = await this.cell(r, c).getValAsync();
      }

      result.push(record);
    }

    return result;
  }

  public async setDataMatrixAsync(matrix: TSdExcelValueType[][]): Promise<void> {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        const val = matrix[r][c];
        await this.cell(r, c).setValAsync(val);
      }
    }
  }

  private async _getDataAsync(): Promise<SdExcelXmlWorksheet> {
    return await this._zipCache.getAsync(`xl/worksheets/sheet${this._relId}.xml`) as SdExcelXmlWorksheet;
  }

  private async _getWbDataAsync(): Promise<SdExcelXmlWorkbook> {
    return await this._zipCache.getAsync("xl/workbook.xml") as SdExcelXmlWorkbook;
  }
}
