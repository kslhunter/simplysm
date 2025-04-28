import { SdExcelCell } from "./sd-excel-cell";
import { SdExcelXmlWorksheet } from "./xmls/sd-excel-xml-worksheet";
import { ZipCache } from "./utils/zip-cache";

export class SdExcelRow {
  #cellMap = new Map<number, SdExcelCell>();

  constructor(
    private readonly _zipCache: ZipCache,
    private readonly _targetFileName: string,
    private readonly _r: number,
  ) {
  }

  cell(c: number): SdExcelCell {
    return this.#cellMap.getOrCreate(
      c,
      new SdExcelCell(this._zipCache, this._targetFileName, this._r, c),
    );
  }

  getCells(): SdExcelCell[] {
    const result: SdExcelCell[] = [];

    const wsData = this.#getWsData();

    const range = wsData.range;
    for (let c = range.s.c; c <= range.e.c; c++) {
      result[c] = this.cell(c);
    }

    return result;
  }

  #getWsData(): SdExcelXmlWorksheet {
    return this._zipCache.get(`xl/worksheets/${this._targetFileName}`) as SdExcelXmlWorksheet;
  }
}
