import * as XLSX from "xlsx";
import { SdExcelReaderDataTable } from "./SdExcelReaderDataTable";

export class SdExcelReaderWorksheet {
  constructor(private readonly _ws: XLSX.WorkSheet) {}

  private _range?: XLSX.Range;
  get range(): XLSX.Range {
    if (!this._range) {
      this._range = XLSX.utils.decode_range(this._ws["!ref"]!)!;
    }
    return this._range;
  }

  val(r: number, c: number): string | number | boolean | Date | undefined {
    const addr = this._addr(r, c);
    const cell = this._ws[addr] as XLSX.CellObject;

    if (!Boolean(cell)) return undefined;
    if (cell.v === undefined || cell.v === "") {
      return undefined;
    } else {
      return cell.v;
    }
  }

  dataTable(
    startRow?: number,
    startCol?: number,
    endRow?: number,
    endCol?: number,
  ): SdExcelReaderDataTable {
    return new SdExcelReaderDataTable(this, {
      s: {
        r:
          startRow === undefined
            ? this.range.s.r
            : startRow < 0
              ? this.range.s.r + startRow
              : startRow,
        c:
          startCol === undefined
            ? this.range.s.c
            : startCol < 0
              ? this.range.s.c + startCol
              : startCol,
      },
      e: {
        r: endRow === undefined ? this.range.e.r : endRow < 0 ? this.range.e.r + endRow : endRow,
        c: endCol === undefined ? this.range.e.c : endCol < 0 ? this.range.e.c + endCol : endCol,
      },
    });
  }

  private _addr(r: number, c: number): string {
    return XLSX.utils.encode_cell({ r, c });
  }
}
