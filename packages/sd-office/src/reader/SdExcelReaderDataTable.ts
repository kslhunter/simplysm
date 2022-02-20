import { SdExcelReaderWorkSheet } from "./SdExcelReaderWorkSheet";
import * as XLSX from "xlsx";

export class SdExcelReaderDataTable {
  private readonly _headerColMap = new Map<string, number>();

  public constructor(private readonly _sws: SdExcelReaderWorkSheet,
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

  public val(r: number, colName: string): boolean | number | string | Date | undefined {
    const c = this._headerColMap.get(colName);
    if (c === undefined) return undefined;
    return this._sws.val(r, c);
  }
}
