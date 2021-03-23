import { SdExcelWorkbook } from "./SdExcelWorkbook";
import { SdExcelCell } from "./SdExcelCell";
import { SdExcelColumn } from "./SdExcelColumn";
import { SdExcelRow } from "./SdExcelRow";
import { SdExcelUtil } from "./utils/SdExcelUtil";
import { NumberUtil, ObjectUtil } from "@simplysm/sd-core-common";

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
    this.rowDataMap.clear();
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

    // row + 1
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

    // merge
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

    // dimension
    if (this.sheetData.worksheet.dimension?.[0]?.$?.ref !== undefined) {
      const dimension = SdExcelUtil.getRangeAddressRowCol(this.sheetData.worksheet.dimension[0].$.ref);
      this.sheetData.worksheet.dimension[0].$.ref =
        SdExcelUtil.getRangeAddress(dimension.fromRow, dimension.fromCol, dimension.toRow + 1, dimension.toCol);
    }

    // drawing
    const anchorArray = this.drawingData?.["xdr:wsDr"]["xdr:oneCellAnchor"];
    if (anchorArray !== undefined && anchorArray.length > 0) {
      for (const anchor of anchorArray) {
        const anchorRow = NumberUtil.parseInt(anchor["xdr:from"][0]["xdr:row"][0]);
        if (anchorRow !== undefined && anchorRow >= row) {
          anchor["xdr:from"][0]["xdr:row"][0] = (anchorRow + 1).toString();
        }
      }
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

  public removeRow(row: number): void {
    const rowDataList = this.sheetData.worksheet.sheetData[0].row as any[];

    // remove
    rowDataList.remove((item: any) => Number(item.$.r) === row + 1);

    // row - 1
    const nextRowDataList = rowDataList.filter((item: any) => Number(item.$.r) > row + 1);
    for (const nextRowData of nextRowDataList) {
      const rowIndex = Number(nextRowData.$.r);
      nextRowData.$.r = (rowIndex - 1).toString();

      if (nextRowData.c !== undefined && nextRowData.c.length > 0) {
        for (const colData of nextRowData.c) {
          const colRowCol = SdExcelUtil.getAddressRowCol(colData.$.r);
          colData.$.r = SdExcelUtil.getAddress(rowIndex - 2, colRowCol.col);
        }
      }
    }

    // merge
    if (
      this.sheetData.worksheet.mergeCells?.[0]?.mergeCell !== undefined &&
      this.sheetData.worksheet.mergeCells[0].mergeCell.length > 0
    ) {
      const removeMergeDataList: any[] = [];
      const mergeDataList: any[] = this.sheetData.worksheet.mergeCells[0].mergeCell;
      for (const mergeData of mergeDataList) {
        const currRowCol = SdExcelUtil.getRangeAddressRowCol(mergeData.$.ref);
        const newFromRow = currRowCol.fromRow - (currRowCol.fromRow > row ? 1 : 0);
        const newToRow = currRowCol.toRow - (currRowCol.toRow > row ? 1 : 0);
        if (
          currRowCol.fromCol === currRowCol.toCol &&
          newFromRow === newToRow
        ) {
          removeMergeDataList.push(mergeData);
        }
        else {
          mergeData.$.ref = SdExcelUtil.getRangeAddress(
            currRowCol.fromRow - (currRowCol.fromRow > row ? 1 : 0),
            currRowCol.fromCol,
            currRowCol.toRow - (currRowCol.toRow > row ? 1 : 0),
            currRowCol.toCol
          );
        }
      }
      mergeDataList.remove((item: any) => removeMergeDataList.includes(item));
      if (mergeDataList.length === 0) {
        delete this.sheetData.worksheet.mergeCells;
      }
    }

    // dimension
    if (this.sheetData.worksheet.dimension?.[0]?.$?.ref !== undefined) {
      const dimension = SdExcelUtil.getRangeAddressRowCol(this.sheetData.worksheet.dimension[0].$.ref);
      this.sheetData.worksheet.dimension[0].$.ref =
        SdExcelUtil.getRangeAddress(dimension.fromRow, dimension.fromCol, dimension.toRow - 1, dimension.toCol);
    }

    // drawing
    if (this.drawingData["xdr:wsDr"]["xdr:oneCellAnchor"] !== undefined && this.drawingData["xdr:wsDr"]["xdr:oneCellAnchor"].length > 0) {
      const anchorList = this.drawingData["xdr:wsDr"]["xdr:oneCellAnchor"] as any[];
      const removeAnchorRows: any[] = [];
      for (const anchor of anchorList) {
        const anchorRow = NumberUtil.parseInt(anchor["xdr:from"][0]["xdr:row"][0]);
        if (anchorRow === row) {
          removeAnchorRows.push(anchor);
        }
        else if (anchorRow !== undefined && anchorRow > row) {
          anchor["xdr:from"][0]["xdr:row"][0] = (anchorRow - 1).toString();
        }
      }
      anchorList.remove((item: any) => removeAnchorRows.includes(item));
    }

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