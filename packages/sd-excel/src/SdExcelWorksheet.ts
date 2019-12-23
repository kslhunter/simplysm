import {SdExcelWorkbook} from "./SdExcelWorkbook";
import {SdExcelCell} from "./SdExcelCell";
import {SdExcelColumn} from "./SdExcelColumn";
import {SdExcelRow} from "./SdExcelRow";
import {SdExcelUtils} from "./utils/SdExcelUtils";

export class SdExcelWorksheet {
  public relData: any;
  public drawingRelData: any;
  public drawingData: any;

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

  public insertEmptyRow(row: number): void {
    const rowDataList = this.sheetData.worksheet.sheetData[0].row as any[];

    const nextRowDataList = rowDataList.filter((item: any) => Number(item.$.r) >= row + 1);
    for (const nextRowData of nextRowDataList) {
      const rowIndex = Number(nextRowData.$.r);
      nextRowData.$.r = (rowIndex + 1).toString();

      if (nextRowData.c && nextRowData.c.length > 0) {
        for (const colData of nextRowData.c) {
          const colRowCol = SdExcelUtils.getAddressRowCol(colData.$.r);
          colData.$.r = SdExcelUtils.getAddress(rowIndex, colRowCol.col);
        }
      }
    }

    if (
      this.sheetData.worksheet.mergeCells &&
      this.sheetData.worksheet.mergeCells[0] &&
      this.sheetData.worksheet.mergeCells[0].mergeCell &&
      this.sheetData.worksheet.mergeCells[0].mergeCell.length > 0
    ) {
      const mergeDataList = this.sheetData.worksheet.mergeCells[0].mergeCell;
      for (const mergeData of mergeDataList) {
        const currRowCol = SdExcelUtils.getRangeAddressRowCol(mergeData.$.ref);
        mergeData.$.ref = SdExcelUtils.getRangeAddress(
          currRowCol.fromRow + (currRowCol.fromRow >= row ? 1 : 0),
          currRowCol.fromCol,
          currRowCol.toRow + (currRowCol.toRow >= row ? 1 : 0),
          currRowCol.toCol
        );
      }
    }

    if (
      this.sheetData.worksheet.dimension &&
      this.sheetData.worksheet.dimension[0] &&
      this.sheetData.worksheet.dimension[0].$.ref
    ) {
      const dimension = SdExcelUtils.getRangeAddressRowCol(this.sheetData.worksheet.dimension[0].$.ref);
      this.sheetData.worksheet.dimension[0].$.ref =
        SdExcelUtils.getRangeAddress(dimension.fromRow, dimension.fromCol, dimension.toRow + 1, dimension.toCol);
    }
  }

  public insertCopyRow(row: number, copyRow: number): void {
    this.insertEmptyRow(row);

    const rowDataList = this.sheetData.worksheet.sheetData[0].row as any[];
    const copyRowData = rowDataList.single((item: any) => Number(item.$.r) === (copyRow >= row ? copyRow + 1 : copyRow));

    const prevRowData = rowDataList.orderBy(item => Number(item.$.r)).last(item => Number(item.$.r) < row + 1);
    const prevRowIndex = prevRowData ? rowDataList.indexOf(prevRowData) : -1;

    const currRowData = Object.clone(copyRowData);
    currRowData.$.r = (row + 1).toString();

    if (currRowData.c && currRowData.c.length > 0) {
      for (const colData of currRowData.c) {
        const colRowCol = SdExcelUtils.getAddressRowCol(colData.$.r);
        colData.$.r = SdExcelUtils.getAddress(row, colRowCol.col);
      }
    }

    rowDataList.insert(prevRowIndex + 1, currRowData);
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