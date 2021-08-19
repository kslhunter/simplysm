import {ExcelWorksheet} from "./ExcelWorksheet";

export class ExcelColumn {
  public colData: any;

  public constructor(private readonly _ews: ExcelWorksheet,
                     private readonly _col: number) {
    this._ews.sheetData.worksheet.cols = this._ews.sheetData.worksheet.cols || [];
    this._ews.sheetData.worksheet.cols[0] = this._ews.sheetData.worksheet.cols[0] || {};
    this._ews.sheetData.worksheet.cols[0].col = this._ews.sheetData.worksheet.cols[0].col || [];
    const colDataList = this._ews.sheetData.worksheet.cols[0].col as any[];

    /*for (const colData of Object.clone(colDataList)) {
      const min = Number(colData.$.min);
      const max = Number(colData.$.max);
      if (min !== max) {
        colDataList.remove((item: any) => item.$.min === colData.$.min);

        for (let i = min; i <= max; i++) {
          const newColData = Object.clone(colData);
          newColData.$.min = i;
          newColData.$.max = i;
          colDataList.push(newColData);
        }
      }
    }*/

    this.colData = colDataList.single(item => Number(item.$.min) <= _col + 1 && Number(item.$.max) >= _col + 1);
    if (!this.colData) {
      this.colData = {
        $: {
          min: (_col + 1).toString(),
          max: (_col + 1).toString(),
          bestFit: "1",
          customWidth: "1",
          width: "9.5"
        }
      };
      colDataList.push(this.colData);
    }
  }

  public set width(value: number) {
    this.colData.$ = this.colData.$ || {min: this._col + 1, max: this._col + 1};
    this.colData.$.width = value;
  }
}