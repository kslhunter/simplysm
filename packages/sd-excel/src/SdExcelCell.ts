import {SdExcelWorksheet} from "./SdExcelWorksheet";
import {SdExcelUtils} from "./utils/SdExcelUtils";
import {SdExcelCellStyle} from "./SdExcelCellStyle";
import {DateOnly, DateTime, optional} from "@simplysm/sd-core";

export class SdExcelCell {
  public cellData: any;

  public get style(): SdExcelCellStyle {
    return new SdExcelCellStyle(this);
  }

  public set value(value: any) {
    if (value === undefined) {
      delete this.cellData.$.t;
      delete this.cellData.v;
    }
    else if (typeof value === "string") {
      this.cellData.$.t = "str";
      this.cellData.v = this.cellData.v || [];
      this.cellData.v[0] = this.cellData.v[0] || {};
      if (Object.keys(this.cellData.v[0]).includes("_")) {
        this.cellData.v[0]._ = value;
      }
      else {
        this.cellData.v[0] = value;
      }
    }
    else if (typeof value === "boolean") {
      this.cellData.$.t = "b";
      this.cellData.v = this.cellData.v || [];
      this.cellData.v[0] = this.cellData.v[0] || {};
      if (Object.keys(this.cellData.v[0]).includes("_")) {
        this.cellData.v[0]._ = value === true ? "1" : value === false ? "0" : undefined;
      }
      else {
        this.cellData.v[0] = value === true ? "1" : value === false ? "0" : undefined;
      }
    }
    else if (typeof value === "number") {
      delete this.cellData.$.t;
      this.style.numberFormat = "number";
      this.cellData.v = this.cellData.v || [];
      this.cellData.v[0] = this.cellData.v[0] || {};
      if (Object.keys(this.cellData.v[0]).includes("_")) {
        this.cellData.v[0]._ = value;
      }
      else {
        this.cellData.v[0] = value;
      }
    }
    else if (value instanceof DateOnly) {
      delete this.cellData.$.t;
      this.style.numberFormat = "DateOnly";
      this.cellData.v = this.cellData.v || [];
      this.cellData.v[0] = this.cellData.v[0] || {};
      if (Object.keys(this.cellData.v[0]).includes("_")) {
        this.cellData.v[0]._ = SdExcelUtils.getTimeNumber(value);
      }
      else {
        this.cellData.v[0] = SdExcelUtils.getTimeNumber(value);
      }
    }
    else if (value instanceof DateTime) {
      delete this.cellData.$.t;
      this.style.numberFormat = "DateTime";
      this.cellData.v = this.cellData.v || [];
      this.cellData.v[0] = this.cellData.v[0] || {};
      if (Object.keys(this.cellData.v[0]).includes("_")) {
        this.cellData.v[0]._ = SdExcelUtils.getTimeNumber(value);
      }
      else {
        this.cellData.v[0] = SdExcelUtils.getTimeNumber(value);
      }
    }
    else {
      throw new Error("지원되지 않는 타입입니다: " + value);
    }
  }

  public get value(): any {
    if (!this.cellData.v) {
      return undefined;
    }

    const value = this.cellData.v[0]._ || this.cellData.v[0];

    if (!value) {
      return undefined;
    }
    else if (this.cellData.$.t === "str") {
      return value;
    }
    else if (this.cellData.$.t === "b") {
      return Number(value) === 1;
    }
    else if (this.cellData.$.t === undefined && this.style.numberFormat === "number") {
      return Number(value);
    }
    else if (this.cellData.$.t === undefined && this.style.numberFormat === "Currency") {
      return Number(value);
    }
    else if (this.cellData.$.t === undefined && this.style.numberFormat === "DateOnly") {
      return SdExcelUtils.getDateOnly(Number(value));
    }
    else if (this.cellData.$.t === undefined && this.style.numberFormat === "DateTime") {
      return SdExcelUtils.getDateTime(Number(value));
    }
    else if (this.cellData.$.t === "s") {
      const sstIndex = Number(value);

      if (this.excelWorkSheet.workbook.sstData.sst.si[sstIndex].t) {
        return this.excelWorkSheet.workbook.sstData.sst.si[sstIndex].t[0]._ || this.excelWorkSheet.workbook.sstData.sst.si[sstIndex].t[0];
      }
      else {
        return this.excelWorkSheet.workbook.sstData.sst.si[sstIndex].r.map((item: any) => item.t[0]).join("");
      }
    }
    else {
      throw new Error("지원되지 않는 타입입니다: " + this.cellData.$.t + ", " + this.style.numberFormat);
    }
  }

  public set formula(value: string | undefined) {
    if (this.cellData.v && ((this.cellData.v[0] && this.cellData.v[0]._) || this.cellData.v._)) {
      throw new Error("하나의 셀에 'value'가 지정된 상태로, 'Formula'를 지정할 수 없습니다. ('formula'를 먼저 지정하고 'value'값을 넣으세요.)");
    }

    if (value === undefined) {
      delete this.cellData.$.t;
      delete this.cellData.f;
    }
    else {
      this.cellData.$.t = "str";
      this.cellData.f = this.cellData.f || {};
      this.cellData.f._ = value;
    }
  }

  public get formula(): string | undefined {
    if (!this.cellData.f) {
      return undefined;
    }
    else {
      return this.cellData.f[0]._ || this.cellData.f[0];
    }
  }

  public constructor(public readonly excelWorkSheet: SdExcelWorksheet,
                     public readonly row: number,
                     public readonly col: number) {
    this.excelWorkSheet.sheetData.worksheet.sheetData[0].row = this.excelWorkSheet.sheetData.worksheet.sheetData[0].row || [];
    const rowNodes = this.excelWorkSheet.sheetData.worksheet.sheetData[0].row as any[];
    let currRow = rowNodes.single((item: any) => Number(item.$.r) === row + 1);
    if (!currRow) {
      currRow = {$: {r: row + 1}};

      const beforeRow = rowNodes.orderBy(item => item.$.r).last(item => item.$.r < currRow.$.r);
      const beforeRowIndex = beforeRow ? rowNodes.indexOf(beforeRow) : -1;

      rowNodes.insert(beforeRowIndex + 1, currRow);
    }

    currRow.c = currRow.c || [];
    const cellNodes = currRow.c as any[];
    let currCell = cellNodes.single((item: any) => item.$.r === SdExcelUtils.getAddress(this.row, this.col));
    if (!currCell) {
      currCell = {$: {r: SdExcelUtils.getAddress(this.row, this.col)}};

      const colStyle = optional(() => this.excelWorkSheet.column(col).colData.$.style);
      if (colStyle) {
        currCell.$.s = colStyle;
      }

      const beforeCell = cellNodes
        .orderBy(item => SdExcelUtils.getAddressRowCol(item.$.r).col)
        .last(item => SdExcelUtils.getAddressRowCol(item.$.r).col < SdExcelUtils.getAddressRowCol(currCell.$.r).col);
      const beforeCellIndex = beforeCell ? cellNodes.indexOf(beforeCell) : -1;

      cellNodes.insert(beforeCellIndex + 1, currCell);
    }

    this.cellData = currCell;
  }

  public merge(row: number, col: number): void {
    this.excelWorkSheet.sheetData.worksheet.mergeCells = this.excelWorkSheet.sheetData.worksheet.mergeCells || [{}];
    this.excelWorkSheet.sheetData.worksheet.mergeCells[0].mergeCell = this.excelWorkSheet.sheetData.worksheet.mergeCells[0].mergeCell || [];
    this.excelWorkSheet.sheetData.worksheet.mergeCells[0].mergeCell.push({
      $: {
        ref: SdExcelUtils.getRangeAddress(this.row, this.col, row, col)
      }
    });
  }
}
