import {SdExcelWorkbook} from "./SdExcelWorkbook";
import {SdExcelCell} from "./SdExcelCell";
import {SdExcelColumn} from "./SdExcelColumn";
import {SdExcelRow} from "./SdExcelRow";

export class SdExcelWorksheet {
  public constructor(public readonly workbook: SdExcelWorkbook,
                     public readonly name: string,
                     public readonly sheetData: any) {
  }

  public cell(row: number, col: number): SdExcelCell {
    return new SdExcelCell(this, row, col);
  }

  public column(col: number): SdExcelColumn {
    return new SdExcelColumn(this, col);
  }

  public row(row: number): SdExcelRow {
    return new SdExcelRow(this, row);
  }

  public get rowLength(): number {
    return this.sheetData.worksheet.sheetData[0].row.length;
  }


  public setData(data: any[][]): void {
    for (let r = 0; r < data.length; r++) {
      for (let c = 0; c < data[r].length; c++) {
        this.cell(r, c).value = data[r][c];
      }
    }
  }

  public getData(): any[][] {
    const result: any[][] = [];
    for (let r = 0; r < this.rowLength; r++) {
      result[r] = [];
      for (let c = 0; c < this.row(r).columnLength; c++) {
        result[r][c] = this.cell(r, c).value;
      }
    }
    return result;
  }
}