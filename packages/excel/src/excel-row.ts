import "@simplysm/core-common";
import { ExcelCell } from "./excel-cell";
import type { ExcelXmlWorksheet } from "./xml/excel-xml-worksheet";
import type { ZipCache } from "./utils/zip-cache";

/** Class representing a row in an Excel worksheet. Provides cell access functionality. */
export class ExcelRow {
  private readonly _cellMap = new Map<number, ExcelCell>();

  constructor(
    private readonly _zipCache: ZipCache,
    private readonly _targetFileName: string,
    private readonly _r: number,
  ) {}

  /** Return cell at the given column index (0-based) */
  cell(c: number): ExcelCell {
    return this._cellMap.getOrCreate(
      c,
      new ExcelCell(this._zipCache, this._targetFileName, this._r, c),
    );
  }

  /** Return all cells in the row */
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
