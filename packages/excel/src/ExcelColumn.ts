import {ExcelWorksheet} from "./ExcelWorksheet";

export class ExcelColumn {
  public colData: any;

  public constructor(private readonly _ews: ExcelWorksheet,
                     private readonly _col: number) {
    this._ews.sheetData.worksheet.cols[0] = this._ews.sheetData.worksheet.cols[0] || {};
    this._ews.sheetData.worksheet.cols[0].col = this._ews.sheetData.worksheet.cols[0].col || [];
    while (this._ews.sheetData.worksheet.cols[0].col.length < _col + 1) {
      this._ews.sheetData.worksheet.cols[0].col.push({});
    }
    this.colData = this._ews.sheetData.worksheet.cols[0].col[_col];
  }

  public set width(value: number) {
    this.colData.$ = this.colData.$ || {min: this._col + 1, max: this._col + 1};
    this.colData.$.width = value;
  }
}