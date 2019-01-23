import {ExcelWorksheet} from "./ExcelWorksheet";
import {ExcelUtils} from "./utils/ExcelUtils";
import {ExcelCellStyle} from "./ExcelCellStyle";
import {DateOnly} from "@simplysm/common";

export class ExcelCell {
  public cellData: any;

  public get style(): ExcelCellStyle {
    return new ExcelCellStyle(this);
  }

  public set value(value: any) {
    if (value === undefined) {
      delete this.cellData.$.t;
      delete this.cellData.v;
    }
    else if (typeof value === "string") {
      this.cellData.$.t = "str";
      this.cellData.v = this.cellData.v || {};
      this.cellData.v._ = value;
    }
    else if (typeof value === "boolean") {
      this.cellData.$.t = "b";
      this.cellData.v = this.cellData.v || {};
      this.cellData.v._ = value === true ? "1" : value === false ? "0" : undefined;
    }
    else if (typeof value === "number") {
      delete this.cellData.$.t;
      this.style.numberFormat = "number";
      this.cellData.v = this.cellData.v || {};
      this.cellData.v._ = value;
    }
    else if (value instanceof DateOnly) {
      delete this.cellData.$.t;
      this.style.numberFormat = "DateOnly";
      this.cellData.v = this.cellData.v || {};
      this.cellData.v._ = ExcelUtils.getTimeNumber(value);
    }
    else {
      throw new Error("지원되지 않는 타입입니다: " + value);
    }
  }

  public get value(): any {
    if (!this.cellData.v) {
      return undefined;
    }
    else if (this.cellData.$.t === "str") {
      return this.cellData.v[0]._ || this.cellData.v[0];
    }
    else if (this.cellData.$.t === undefined && this.style.numberFormat === "number") {
      return Number(this.cellData.v[0]._ || this.cellData.v[0]);
    }
    else if (this.cellData.$.t === undefined && this.style.numberFormat === "DateOnly") {
      return ExcelUtils.getDateOnly(Number(this.cellData.v[0]._ || this.cellData.v[0]));
    }
    else if (this.cellData.$.t === "s") {
      const sstIndex = Number(this.cellData.v[0]._ || this.cellData.v[0]);

      if (this.ews.workbook.sstData.sst.si[sstIndex].t) {
        return this.ews.workbook.sstData.sst.si[sstIndex].t[0]._ || this.ews.workbook.sstData.sst.si[sstIndex].t[0];
      }
      else {
        return this.ews.workbook.sstData.sst.si[sstIndex].r.map((item: any) => item.t[0]).join("");
      }
    }
    else {
      throw new Error("지원되지 않는 타입입니다: " + this.cellData.$.t);
    }
  }

  public constructor(public readonly ews: ExcelWorksheet,
                     public readonly row: number,
                     public readonly col: number) {
    this.ews.sheetData.worksheet.sheetData[0].row = this.ews.sheetData.worksheet.sheetData[0].row || [];
    let currRow = this.ews.sheetData.worksheet.sheetData[0].row.single((item: any) => Number(item.$.r) === row + 1);
    if (!currRow) {
      currRow = {$: {r: row + 1}};
      this.ews.sheetData.worksheet.sheetData[0].row.push(currRow);
    }

    currRow.c = currRow.c || [];
    let currCell = currRow.c.single((item: any) => item.$.r === ExcelUtils.getAddress(this.row, this.col));
    if (!currCell) {
      currCell = {$: {r: ExcelUtils.getAddress(this.row, this.col)}};
      currRow.c.push(currCell);
    }

    this.cellData = currCell;
  }

  public merge(row: number, col: number): void {
    this.ews.sheetData.worksheet.mergeCells = this.ews.sheetData.worksheet.mergeCells || [{}];
    this.ews.sheetData.worksheet.mergeCells[0].mergeCell = this.ews.sheetData.worksheet.mergeCells[0].mergeCell || [];
    this.ews.sheetData.worksheet.mergeCells[0].mergeCell.push({
      $: {
        ref: ExcelUtils.getRangeAddress(this.row, this.col, row, col)
      }
    });
  }
}
