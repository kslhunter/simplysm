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

  public val(r: number, c: number): boolean | number | string | Date | undefined {
    const addr = this._addr(r, c);
    const cell = this._ws[addr];

    if (!Boolean(cell)) return undefined;
    if (cell.t === "b") {
      return cell.v as boolean;
    }
    else if (cell.t === "e") {
      throw new Error(`Addr[${r}, ${c}]: ` + cell.w);
    }
    else if (cell.t === "n") {
      return Math.round(cell.v * 10000000000) / 10000000000;
    }
    else if (cell.t === "d") {
      return cell.v as Date;
    }
    else if (cell.t === "s") {
      return cell.v as string;
    }

    return undefined;
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
