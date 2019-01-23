import {ExcelWorksheet} from "./ExcelWorksheet";

export class ExcelRow {
  public rowData: any;

  public constructor(private readonly _ews: ExcelWorksheet,
                     row: number) {
    this.rowData = this._ews.sheetData.worksheet.sheetData[0].row.single((item: any) => Number(item.$.r) === row);
  }

  public get columnLength(): number {
    return this.rowData.c.length;
  }
}