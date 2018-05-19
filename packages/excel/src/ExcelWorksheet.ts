import * as xlsx from "xlsx";

export class ExcelWorksheet {
  public ws = xlsx.utils.json_to_sheet([]);

  public setData(obj: object[]): void {
    xlsx.utils.sheet_add_json(this.ws, obj);
  }
}