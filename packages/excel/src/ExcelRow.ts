import {ExcelWorksheet} from "./ExcelWorksheet";
import {ExcelUtils} from "./utils/ExcelUtils";

export class ExcelRow {
  public rowData: any;

  public constructor(private readonly _ews: ExcelWorksheet,
                     row: number) {
    this.rowData = this._ews.sheetData.worksheet.sheetData[0].row.single((item: any) => Number(item.$.r) === row + 1);
  }

  public get columnLength(): number {
    if (!this.rowData || !this.rowData.c) {
      return 0;
    }

    const lastAddr = this.rowData.c.last().$.r;
    const rowCol = ExcelUtils.getAddressRowCol(lastAddr);
    return rowCol.col + 1;
  }
}