import {ExcelWorkbook} from "./ExcelWorkbook";
import {ExcelCell} from "./ExcelCell";

export class ExcelWorksheet {
  public constructor(public readonly workbook: ExcelWorkbook,
                     public readonly name: string,
                     public readonly sheetData: any) {
  }

  public cell(row: number, col: number): ExcelCell {
    return new ExcelCell(this, row, col);
  }
}