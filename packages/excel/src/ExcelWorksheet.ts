import {ExcelWorkbook} from "./ExcelWorkbook";
import {ExcelCell} from "./ExcelCell";
import {ExcelColumn} from "./ExcelColumn";
import {ExcelRow} from "./ExcelRow";

export class ExcelWorksheet {
  public constructor(public readonly workbook: ExcelWorkbook,
                     public readonly name: string,
                     public readonly sheetData: any) {
  }

  public cell(row: number, col: number): ExcelCell {
    return new ExcelCell(this, row, col);
  }

  public column(col: number): ExcelColumn {
    return new ExcelColumn(this, col);
  }

  public row(row: number): ExcelRow {
    return new ExcelRow(this, row);
  }

  public get rowLength(): number {
    return this.sheetData.worksheet.sheetData[0].row.length;
  }
}