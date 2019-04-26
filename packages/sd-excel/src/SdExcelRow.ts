import { SdExcelWorksheet } from "./SdExcelWorksheet";
import { SdExcelUtils } from "./utils/SdExcelUtils";

export class SdExcelRow {
  public rowData: any;

  public constructor(private readonly _ews: SdExcelWorksheet, row: number) {
    this.rowData = this._ews.sheetData.worksheet.sheetData[0].row.single((item: any) => Number(item.$.r) === row);
  }

  public get columnLength(): number {
    const lastAddr = this.rowData.c.last().$.r;
    const rowCol = SdExcelUtils.getAddressRowCol(lastAddr);
    return rowCol.col + 1;
  }
}
