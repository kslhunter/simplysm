import {
  ISdExcelAddressRangePoint,
  ISdExcelCellData,
  ISdExcelRowData,
  ISdExcelXml,
  ISdExcelXmlWorksheetData
} from "../commons";
import { SdExcelUtil } from "../utils/SdExcelUtil";
import { NumberUtil } from "@simplysm/sd-core-common";

export class SdExcelXmlWorksheet implements ISdExcelXml {
  public readonly data: ISdExcelXmlWorksheetData;

  private readonly _rowDataMap = new Map<string, ISdExcelRowData>();
  private readonly _cellDataMap = new Map<string, ISdExcelCellData>();

  public range: ISdExcelAddressRangePoint;

  public constructor(data?: ISdExcelXmlWorksheetData) {
    if (data === undefined) {
      this.data = {
        "worksheet": {
          "$": {
            "xmlns": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          },
          "dimension": [{
            "$": {
              "ref": "A1"
            }
          }],
          "sheetData": [{}]
        }
      };
    }
    else {
      this.data = data;
    }

    for (const row of this.data.worksheet.sheetData[0].row ?? []) {
      this._rowDataMap.set(row.$.r, row);
      for (const cell of row.c) {
        this._cellDataMap.set(cell.$.r, cell);
      }
    }

    const ref = this.data.worksheet.dimension[0].$.ref;
    this.range = SdExcelUtil.parseRangeAddr(ref);
  }

  public getCellData(point: { r: number; c: number }): ISdExcelCellData | undefined {
    const cellAddr = SdExcelUtil.stringifyAddr({ r: point.r, c: point.c });
    return this._cellDataMap.get(cellAddr);
  }

  public getOrCreateCellData(point: { r: number; c: number }): ISdExcelCellData {
    // ROW 없으면 만들기
    const rowAddr = (point.r + 1).toString();
    let rowData = this._rowDataMap.get(rowAddr);
    if (rowData === undefined) {
      const rowsData = this.data.worksheet.sheetData[0].row = this.data.worksheet.sheetData[0].row ?? [];

      rowData = { "$": { "r": rowAddr }, c: [] };
      rowsData.push(rowData);
      this._rowDataMap.set(rowAddr, rowData);
    }

    // CELL 없으면 만들기
    const cellAddr = SdExcelUtil.stringifyAddr({ r: point.r, c: point.c });
    let cellData = this._cellDataMap.get(cellAddr);
    if (cellData === undefined) {
      const cellsData = rowData.c;

      cellData = { "$": { "r": SdExcelUtil.stringifyAddr({ r: point.r, c: point.c }) }, "v": [""] };
      cellsData.push(cellData);
      this._cellDataMap.set(cellAddr, cellData);

      // RANGE 새로고침
      this.range = {
        s: { r: Math.min(point.r, this.range.s.r), c: Math.min(point.c, this.range.s.c) },
        e: { r: Math.max(point.r, this.range.e.r), c: Math.max(point.c, this.range.e.c) }
      };
    }

    return cellData;
  }

  public deleteCellData(point: { r: number; c: number }): void {
    // ROW 없으면 무효
    const rowAddr = (point.r + 1).toString();
    const rowData = this._rowDataMap.get(rowAddr);
    if (rowData === undefined) return;

    // CELL 없으면 무효
    const cellAddr = SdExcelUtil.stringifyAddr({ r: point.r, c: point.c });
    const cellData = this._cellDataMap.get(cellAddr);
    if (cellData === undefined) return;

    // CELL 삭제
    const cellsData = rowData.c;
    cellsData.remove(cellData);
    this._cellDataMap.delete(cellAddr);

    // 마지막 CELL이면 ROW도 삭제
    const rowsData = this.data.worksheet.sheetData[0].row!;
    if (cellsData.length === 0) {
      rowsData.remove(rowData);
      this._rowDataMap.delete(rowAddr);
    }

    // ROW가 없으면 XML의 row부분 자체를 삭제
    if (rowsData.length === 0) {
      delete this.data.worksheet.sheetData[0].row;
    }

    // RANGE 새로고침
    this._refreshDimension();
  }

  private _refreshDimension(): void {
    // TODO: 마지막 컬럼이 MERGE인 경우 MERGE크기에 따라 모두 활성화 해야함

    for (const addr of this._cellDataMap.keys()) {
      const point = SdExcelUtil.parseAddr(addr);

      this.range = {
        s: { r: Math.min(point.r, this.range.s.r), c: Math.min(point.c, this.range.s.c) },
        e: { r: Math.max(point.r, this.range.e.r), c: Math.max(point.c, this.range.e.c) }
      };
    }
  }

  public prepareSave(): void {
    // ROW 정렬
    const rowsData = this.data.worksheet.sheetData[0].row = this.data.worksheet.sheetData[0].row ?? [];
    rowsData.orderByThis((item) => NumberUtil.parseInt(item.$.r));

    // CELL 정렬
    for (const rowData of rowsData) {
      const cellsData = rowData.c;
      cellsData.orderByThis((item) => SdExcelUtil.parseAddr(item.$.r).c);
    }

    // Dimension 값 적용
    this.data.worksheet.dimension[0].$.ref = SdExcelUtil.stringifyRangeAddr(this.range);
  }
}
