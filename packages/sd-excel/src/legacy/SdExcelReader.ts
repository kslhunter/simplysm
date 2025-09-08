import * as XLSX from "xlsx";
import { SdExcelReaderWorksheet } from "./SdExcelReaderWorksheet";

export class SdExcelReader {
  readonly #wb: XLSX.WorkBook;

  constructor(data: Buffer) {
    this.#wb = XLSX.read(data, {
      type: Buffer.isBuffer(data) ? "buffer" : "array",
      codepage: 949,
    });
  }

  get sheetNames(): string[] {
    return this.#wb.SheetNames;
  }

  getWorkSheet(name: string): SdExcelReaderWorksheet;
  getWorkSheet(index: number): SdExcelReaderWorksheet;
  getWorkSheet(arg: string | number): SdExcelReaderWorksheet {
    if (typeof arg === "number") {
      if (!Boolean(this.#wb.SheetNames[arg])) {
        throw new Error(`${arg + 1}번째 시트를 찾을 수 없습니다.`);
      }
      return new SdExcelReaderWorksheet(this.#wb.Sheets[this.#wb.SheetNames[0]]);
    } else {
      if (!this.#wb.SheetNames.includes(arg)) {
        throw new Error(`시트'${arg}'를 찾을 수 없습니다.`);
      }
      return new SdExcelReaderWorksheet(this.#wb.Sheets[arg]);
    }
  }
}
