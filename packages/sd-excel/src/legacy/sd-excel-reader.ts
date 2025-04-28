import * as XLSX from "xlsx";
import { SdExcelReaderWorksheet } from "./sd-excel-reader-worksheet";

export class SdExcelReader {
  private readonly _wb: XLSX.WorkBook;

  public constructor(data: Uint8Array | Buffer) {
    this._wb = XLSX.read(data, {
      type: data instanceof Buffer ? "buffer" : "array",
      codepage: 949,
    });
  }

  public get sheetNames(): string[] {
    return this._wb.SheetNames;
  }

  public getWorkSheet(name: string): SdExcelReaderWorksheet;
  public getWorkSheet(index: number): SdExcelReaderWorksheet;
  public getWorkSheet(arg: string | number): SdExcelReaderWorksheet {
    if (typeof arg === "number") {
      if (!Boolean(this._wb.SheetNames[arg])) {
        throw new Error(`${arg + 1}번째 시트를 찾을 수 없습니다.`);
      }
      return new SdExcelReaderWorksheet(this._wb.Sheets[this._wb.SheetNames[0]]);
    }
    else {
      if (!this._wb.SheetNames.includes(arg)) {
        throw new Error(`시트'${arg}'를 찾을 수 없습니다.`);
      }
      return new SdExcelReaderWorksheet(this._wb.Sheets[arg]);
    }
  }
}
