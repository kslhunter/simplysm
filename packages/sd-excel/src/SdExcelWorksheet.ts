import { SdExcelWorkbook } from "./SdExcelWorkbook";
import { SdExcelCell } from "./SdExcelCell";
import { SdExcelColumn } from "./SdExcelColumn";
import { SdExcelRow } from "./SdExcelRow";
import { SdExcelUtil } from "./utils/SdExcelUtil";
import { ObjectUtil } from "@simplysm/sd-core-common";

export class SdExcelWorksheet {
  public relData: any;
  public drawingRelData: any;
  public drawingData: any;

  public rowDataMap = new Map<number, any>();

  public constructor(public readonly workbook: SdExcelWorkbook,
                     public readonly name: string,
                     public readonly sheetData: any) {
    this._reloadRows();
  }

  private _reloadRows(): void {
    for (const rowData of this.sheetData?.worksheet.sheetData[0].row ?? []) {
      const rowIndex = rowData.$.r - 1;
      this.rowDataMap.set(rowIndex, rowData);
    }
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
    const length = Array.from(this.rowDataMap.keys()).max() ?? 0;
    if (length === 0) {
      return this.sheetData.worksheet.sheetData[0].row?.length ?? 0;
    }
    return length + 1;
  }

  public insertEmptyRow(row: number): void {
    const rowDataList = this.sheetData.worksheet.sheetData[0].row as any[];

    const nextRowDataList = rowDataList.filter((item: any) => Number(item.$.r) >= row + 1);
    for (const nextRowData of nextRowDataList) {
      const rowIndex = Number(nextRowData.$.r);
      nextRowData.$.r = (rowIndex + 1).toString();

      if (nextRowData.c !== undefined && nextRowData.c.length > 0) {
        for (const colData of nextRowData.c) {
          const colRowCol = SdExcelUtil.getAddressRowCol(colData.$.r);
          colData.$.r = SdExcelUtil.getAddress(rowIndex, colRowCol.col);
        }
      }
    }

    if (
      this.sheetData.worksheet.mergeCells?.[0]?.mergeCell !== undefined &&
      this.sheetData.worksheet.mergeCells[0].mergeCell.length > 0
    ) {
      const mergeDataList = this.sheetData.worksheet.mergeCells[0].mergeCell;
      for (const mergeData of mergeDataList) {
        const currRowCol = SdExcelUtil.getRangeAddressRowCol(mergeData.$.ref);
        mergeData.$.ref = SdExcelUtil.getRangeAddress(
          currRowCol.fromRow + (currRowCol.fromRow >= row ? 1 : 0),
          currRowCol.fromCol,
          currRowCol.toRow + (currRowCol.toRow >= row ? 1 : 0),
          currRowCol.toCol
        );
      }
    }

    if (this.sheetData.worksheet.dimension?.[0]?.$?.ref !== undefined) {
      const dimension = SdExcelUtil.getRangeAddressRowCol(this.sheetData.worksheet.dimension[0].$.ref);
      this.sheetData.worksheet.dimension[0].$.ref =
        SdExcelUtil.getRangeAddress(dimension.fromRow, dimension.fromCol, dimension.toRow + 1, dimension.toCol);
    }

    this._reloadRows();
  }

  public insertCopyRow(row: number, copyRow: number): void {
    this.insertEmptyRow(row);

    const rowDataList = this.sheetData.worksheet.sheetData[0].row as any[];
    const copyRowData = rowDataList.single((item: any) => Number(item.$.r) === (copyRow >= row ? copyRow + 1 : copyRow));

    const prevRowData = rowDataList.orderBy((item) => Number(item.$.r)).last((item) => Number(item.$.r) < row + 1);
    const prevRowIndex = prevRowData !== undefined ? rowDataList.indexOf(prevRowData) : -1;

    const currRowData = ObjectUtil.clone(copyRowData);
    currRowData.$.r = (row + 1).toString();

    if (currRowData.c !== undefined && currRowData.c.length > 0) {
      for (const colData of currRowData.c) {
        const colRowCol = SdExcelUtil.getAddressRowCol(colData.$.r);
        colData.$.r = SdExcelUtil.getAddress(row, colRowCol.col);
      }
    }

    rowDataList.insert(prevRowIndex + 1, currRowData);

    this._reloadRows();
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