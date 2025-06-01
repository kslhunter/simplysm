import * as XLSX from "xlsx";
import {SdExcelReaderDataTable} from "./sd-excel-reader-data-table";

export class SdExcelReaderWorksheet {
  constructor(private readonly _ws: XLSX.WorkSheet) {
  }

  #range?: XLSX.Range;
  get range(): XLSX.Range {
    if (!this.#range) {
      this.#range = XLSX.utils.decode_range(this._ws["!ref"]!)!;
    }
    return this.#range;
  }

  val(r: number, c: number): string | number | boolean | Date | undefined {
    const addr = this.#addr(r, c);
    const cell = this._ws[addr] as XLSX.CellObject;

    if (!Boolean(cell)) return undefined;
    if (cell.v === undefined || cell.v === "") {
      return undefined;
    }
    else {
      return cell.v;
    }
  }

  dataTable(startRow?: number, startCol?: number, endRow?: number, endCol?: number): SdExcelReaderDataTable {
    return new SdExcelReaderDataTable(this, {
      s: {
        r: startRow === undefined ? this.range.s.r : startRow < 0 ? this.range.s.r + startRow : startRow,
        c: startCol === undefined ? this.range.s.c : startCol < 0 ? this.range.s.c + startCol : startCol,
      },
      e: {
        r: endRow === undefined ? this.range.e.r : endRow < 0 ? this.range.e.r + endRow : endRow,
        c: endCol === undefined ? this.range.e.c : endCol < 0 ? this.range.e.c + endCol : endCol,
      }
    });
  }

  #addr(r: number, c: number): string {
    return XLSX.utils.encode_cell({r, c});
  }
}
