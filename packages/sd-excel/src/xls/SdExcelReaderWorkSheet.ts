import * as XLSX from "xlsx";
import { SdExcelReaderDataTable } from "./SdExcelReaderDataTable";

export class SdExcelReaderWorkSheet {
  public constructor(private readonly _ws: XLSX.WorkSheet) {
  }

  private _range?: XLSX.Range;
  public get range(): XLSX.Range {
    if (!this._range) {
      this._range = XLSX.utils.decode_range(this._ws["!ref"]!)!;
    }
    return this._range;
  }

  public val(r: number, c: number): string | number | boolean | Date | undefined {
    const addr = this._addr(r, c);
    const cell = this._ws[addr];

    if (!Boolean(cell)) return undefined;
    if (cell.v === undefined || cell.v === "") {
      return undefined;
    }
    else {
      return cell.v;
    }
  }

  public dataTable(startRow?: number, startCol?: number, endRow?: number, endCol?: number): SdExcelReaderDataTable {
    return new SdExcelReaderDataTable(this, {
      s: {
        r: startRow ?? this.range.s.r,
        c: startCol ?? this.range.s.c
      },
      e: {
        r: endRow ?? this.range.e.r,
        c: endCol ?? this.range.e.c
      }
    });
  }

  private _addr(r: number, c: number): string {
    return XLSX.utils.encode_cell({ r, c });
  }
}
