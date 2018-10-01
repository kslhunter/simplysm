import {ExcelWorksheet} from "./ExcelWorksheet";
import * as xlsx from "xlsx";

export class ExcelWorkbook {
  private readonly _wb: xlsx.WorkBook;

  public get json(): { [sheetName: string]: { [key: string]: any }[] } {
    const result = {};
    for (const sheetName of this._wb.SheetNames) {
      result[sheetName] = xlsx.utils.sheet_to_json(this._wb.Sheets[sheetName]);
    }
    return result;
  }

  public constructor(wb?: xlsx.WorkBook) {
    this._wb = wb || xlsx.utils.book_new();
  }

  public static async loadAsync(file: File): Promise<ExcelWorkbook> {
    return await new Promise<ExcelWorkbook>(resolve => {
      const reader: FileReader = new FileReader();
      reader.onload = (e: any) => {
        const bstr: string = e.target.result;
        const wb = xlsx.read(bstr, {type: "binary"});
        resolve(new ExcelWorkbook(wb));
      };
      reader.readAsBinaryString(file);
    });
  }

  public createWorksheet(name: string): ExcelWorksheet {
    const excelWs = new ExcelWorksheet();
    xlsx.utils.book_append_sheet(this._wb, excelWs.ws, name);
    return excelWs;
  }

  public download(filename: string): void {
    xlsx.writeFile(this._wb, filename);
  }
}