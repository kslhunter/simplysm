import { SdExcelCell } from "./sd-excel-cell";
import { SdExcelXmlWorksheet } from "./xmls/sd-excel-xml-worksheet";
import { ZipCache } from "./utils/zip-cache";

export class SdExcelCol {
  #cellMap = new Map<number, SdExcelCell>();

  constructor(
    private readonly _zipCache: ZipCache,
    private readonly _targetFileName: string,
    private readonly _c: number,
  ) {
  }

  cell(r: number): SdExcelCell {
    return this.#cellMap.getOrCreate(
      r,
      new SdExcelCell(this._zipCache, this._targetFileName, r, this._c),
    );
  }

  getCells(): SdExcelCell[] {
    const result: SdExcelCell[] = [];

    const wsData = this.#getWsData();

    const range = wsData.range;
    for (let r = range.s.r; r <= range.e.r; r++) {
      result[r] = this.cell(r);
    }

    return result;
  }

  setWidth(size: number) {
    const wsData = this.#getWsData();
    wsData.setColWidth((this._c + 1).toString(), size.toString());
  }

  #getWsData(): SdExcelXmlWorksheet {
    return this._zipCache.get(`xl/worksheets/${this._targetFileName}`) as SdExcelXmlWorksheet;
  }
}
