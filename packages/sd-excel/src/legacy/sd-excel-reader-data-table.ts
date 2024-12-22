import {SdExcelReaderWorksheet} from "./sd-excel-reader-worksheet";
import * as XLSX from "xlsx";

export class SdExcelReaderDataTable {
  private readonly _headerColMap = new Map<string, number>();

  public constructor(private readonly _sws: SdExcelReaderWorksheet,
                     private readonly _range: XLSX.Range) {
    for (let c = this._range.s.c; c <= this._range.e.c; c++) {
      const v = this._sws.val(this._range.s.r, c);
      if (typeof v === "string") {
        if (this._headerColMap.has(v)) {
          throw new Error("컬럼중복");
        }
        else {
          this._headerColMap.set(v, c);
        }
      }
    }
  }

  public get rowLength(): number {
    return this._range.e.r - this._range.s.r;
  }

  public get headers(): (string | undefined)[] {
    const result: (string | undefined)[] = [];
    for (const entry of this._headerColMap.entries()) {
      result[entry[1]] = entry[0];
    }
    return result;
  }

  public val(r: number, colName: string): any {
    const c = this._headerColMap.get(colName);
    if (c === undefined) return undefined;
    return this._sws.val(r + this._range.s.r + 1, c);
  }

  public map<R>(cb: (r: number) => R, filterCb?: (r: number) => boolean): R[] {
    const result: R[] = [];

    for (let r = this._range.s.r + 1; r <= this._range.e.r; r++) {
      if (!filterCb || filterCb(r)) {
        result.push(cb(r));
      }
    }

    return result;
  }

  public mapMany<R>(cb: (r: number) => R[], filterCb?: (r: number) => boolean): R[] {
    const result: R[] = [];

    for (let r = this._range.s.r + 1; r <= this._range.e.r; r++) {
      if (!filterCb || filterCb(r)) {
        result.push(...cb(r));
      }
    }

    return result;
  }
}
