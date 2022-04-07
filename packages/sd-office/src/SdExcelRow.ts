import { SdExcelWorksheet } from "./SdExcelWorksheet";
import { SdExcelUtil } from "./utils/SdExcelUtil";

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

    const lastAddr = this.rowData.c.last().$?.r;
    if (lastAddr === undefined) {
      return this.rowData.c.length;
    }

    const rowCol = SdExcelUtil.getAddressRowCol(lastAddr);
    return rowCol.col + 1;
  }

  public get height(): number | undefined {
    return this.rowData?.$.ht ?? undefined;
  }

  public set height(value: number | undefined) {
    this.rowData = this.rowData ?? {};
    this.rowData.$ = this.rowData.$ ?? {};
    this.rowData.$.ht = value;
  }
}