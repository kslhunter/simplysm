import * as XLSX from "xlsx";
import { SdExcelReaderWorkSheet } from "./SdExcelReaderWorkSheet";

export class SdExcelReader {
  private readonly _wb: XLSX.WorkBook;

  public constructor(data: Uint8Array) {
    this._wb = XLSX.read(data, { type: "array", codepage: 949 });
  }

  public get sheetNames(): string[] {
    return this._wb.SheetNames;
  }

  public getWorkSheet(name: string): SdExcelReaderWorkSheet
  public getWorkSheet(index: number): SdExcelReaderWorkSheet
  public getWorkSheet(arg: string | number): SdExcelReaderWorkSheet {
    if (typeof arg === "number") {
      if (!this._wb.SheetNames[arg]) {
        throw new Error(`${arg + 1}번째 시트를 찾을 수 없습니다.`);
      }
      return new SdExcelReaderWorkSheet(this._wb.Sheets[this._wb.SheetNames[0]]);
    }
    else {
      if (!this._wb.SheetNames.includes(arg)) {
        throw new Error(`시트'${arg}'를 찾을 수 없습니다.`);
      }
      return new SdExcelReaderWorkSheet(this._wb.Sheets[arg]);
    }
  }
}
