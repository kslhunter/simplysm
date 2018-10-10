import {ExcelWorksheet} from "./ExcelWorksheet";
import {ExcelUtils} from "./utils/ExcelUtils";

export class ExcelCell {
  public cellData: any;

  public set value(value: any) {
    if (typeof value === "string") {
      this.cellData.$.t = "str";
      this.cellData.v = [value];
    }
    else {
      throw new Error("미구현");
    }
  }

  public get value(): any {
    if (this.cellData.$.t === "str") {
      return this.cellData.v[0];
    }
    else {
      throw new Error("미구현");
    }
  }

  public constructor(private readonly _ews: ExcelWorksheet,
                     private readonly _row: number,
                     private readonly _col: number) {
    this._ews.sheetData.worksheet.sheetData[0].row = this._ews.sheetData.worksheet.sheetData[0].row || [];
    let currRow = this._ews.sheetData.worksheet.sheetData[0].row.single((item: any) => Number(item.$.r) === 1);
    if (!currRow) {
      currRow = {$: {r: 1}};
      this._ews.sheetData.worksheet.sheetData[0].row.push(currRow);
    }

    currRow.c = currRow.c || [];
    let currCell = currRow.c.single((item: any) => item.$.r === ExcelUtils.getAddress(this._row, this._col));
    if (!currCell) {
      currCell = {$: {r: ExcelUtils.getAddress(this._row, this._col)}};
      currRow.c.push(currCell);
    }

    this.cellData = currCell;
  }

  public merge(row: number, col: number): void {
    this._ews.sheetData.worksheet.mergeCells = this._ews.sheetData.worksheet.mergeCells || [{}];
    this._ews.sheetData.worksheet.mergeCells[0].mergeCell = this._ews.sheetData.worksheet.mergeCells[0].mergeCell || [];
    this._ews.sheetData.worksheet.mergeCells[0].mergeCell.push({
      $: {
        ref: ExcelUtils.getRangeAddress(this._row, this._col, row, col)
      }
    });
  }
}