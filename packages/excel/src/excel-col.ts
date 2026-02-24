import "@simplysm/core-common";
import { ExcelCell } from "./excel-cell";
import type { ExcelXmlWorksheet } from "./xml/excel-xml-worksheet";
import type { ZipCache } from "./utils/zip-cache";

/** Class representing a column in an Excel worksheet. Provides cell access and column width configuration. */
export class ExcelCol {
  private readonly _cellMap = new Map<number, ExcelCell>();

  constructor(
    private readonly _zipCache: ZipCache,
    private readonly _targetFileName: string,
    private readonly _c: number,
  ) {}

  /** Return cell at the given row index (0-based) */
  cell(r: number): ExcelCell {
    return this._cellMap.getOrCreate(
      r,
      new ExcelCell(this._zipCache, this._targetFileName, r, this._c),
    );
  }

  /** Return all cells in the column */
  async getCells(): Promise<ExcelCell[]> {
    const result: ExcelCell[] = [];
    const wsData = await this._getWsData();
    const range = wsData.range;

    for (let r = range.s.r; r <= range.e.r; r++) {
      result[r] = this.cell(r);
    }

    return result;
  }

  /** Set column width */
  async setWidth(size: number): Promise<void> {
    const wsData = await this._getWsData();
    wsData.setColWidth((this._c + 1).toString(), size.toString());
  }

  private async _getWsData(): Promise<ExcelXmlWorksheet> {
    return (await this._zipCache.get(`xl/worksheets/${this._targetFileName}`)) as ExcelXmlWorksheet;
  }
}
