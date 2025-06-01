import { SdExcelReaderWorksheet } from "./sd-excel-reader-worksheet";
import * as XLSX from "xlsx";

export class SdExcelReaderDataTable {
  #headerColMap = new Map<string, number>();

  constructor(
    private readonly _sws: SdExcelReaderWorksheet,
    private readonly _range: XLSX.Range,
  ) {
    for (let c = this._range.s.c; c <= this._range.e.c; c++) {
      const v = this._sws.val(this._range.s.r, c);
      if (typeof v === "string") {
        if (this.#headerColMap.has(v)) {
          throw new Error(`컬럼중복(${v})`);
        } else {
          this.#headerColMap.set(v, c);
        }
      }
    }
  }

  get rowLength(): number {
    return this._range.e.r - this._range.s.r;
  }

  get headers(): (string | undefined)[] {
    const result: (string | undefined)[] = [];
    for (const entry of this.#headerColMap.entries()) {
      result[entry[1]] = entry[0];
    }
    return result;
  }

  val(r: number, colName: string): any {
    const c = this.#headerColMap.get(colName);
    if (c === undefined) return undefined;
    return this._sws.val(r + this._range.s.r + 1, c);
  }

  map<R>(cb: (r: number) => R, filterCb?: (r: number) => boolean): R[] {
    const result: R[] = [];

    for (let r = this._range.s.r + 1; r <= this._range.e.r; r++) {
      if (!filterCb || filterCb(r)) {
        result.push(cb(r));
      }
    }

    return result;
  }

  mapMany<R>(cb: (r: number) => R[], filterCb?: (r: number) => boolean): R[] {
    const result: R[] = [];

    for (let r = this._range.s.r + 1; r <= this._range.e.r; r++) {
      if (!filterCb || filterCb(r)) {
        result.push(...cb(r));
      }
    }

    return result;
  }
}
