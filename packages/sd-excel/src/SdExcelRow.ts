import { SdExcelWorksheet } from "./SdExcelWorksheet";
import { SdExcelUtils } from "./utils/SdExcelUtils";

export class SdExcelRow {
  public rowData: any;

  public constructor(private readonly _ews: SdExcelWorksheet,
                     row: number) {
    this.rowData = this._ews.rowDataMap.get(row);
    // this.rowData = this._ews.sheetData.worksheet.sheetData[0].row.single((item: any) => Number(item.$.r) === row + 1);
  }

  public get columnLength(): number {
    if (this.rowData?.c === undefined) {
      return 0;
    }

    const lastAddr = this.rowData.c.last().$.r;
    const rowCol = SdExcelUtils.getAddressRowCol(lastAddr);
    return rowCol.col + 1;
  }
}