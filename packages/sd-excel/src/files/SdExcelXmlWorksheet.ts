import {
  ISdExcelAddressRangePoint,
  ISdExcelCellData,
  ISdExcelRowData,
  ISdExcelXml,
  ISdExcelXmlWorksheetData
} from "../commons";
import { SdExcelUtil } from "../utils/SdExcelUtil";

export class SdExcelXmlWorksheet implements ISdExcelXml {
  public readonly data: ISdExcelXmlWorksheetData;

  private readonly _rowDataMap = new Map<string, ISdExcelRowData>();
  private readonly _cellDataMap = new Map<string, ISdExcelCellData>();

  public get range(): ISdExcelAddressRangePoint {
    const ref = this.data.worksheet.dimension[0].$.ref;
    return SdExcelUtil.parseRangeAddr(ref);
  }

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
      rowsData.orderByThis((item) => item.$.r);
      this._rowDataMap.set(rowAddr, rowData);
    }

    // CELL 없으면 만들기
    const cellAddr = SdExcelUtil.stringifyAddr({ r: point.r, c: point.c });
    let cellData = this._cellDataMap.get(cellAddr);
    if (cellData === undefined) {
      const cellsData = rowData.c;

      cellData = { "$": { "r": SdExcelUtil.stringifyAddr({ r: point.r, c: point.c }) }, "v": [""] };
      cellsData.push(cellData);
      cellsData.orderByThis((item) => item.$.r);
      this._cellDataMap.set(cellAddr, cellData);

      // TODO: RANGE 안에 없을때만 아래 수행
      this._refreshDimension();
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

    if (this._cellDataMap.size === 0) {
      this.data.worksheet.dimension[0].$.ref = "A1";
      return;
    }

    let range = {
      s: { r: Number.MAX_VALUE, c: Number.MAX_VALUE },
      e: { r: 0, c: 0 }
    };
    for (const addr of this._cellDataMap.keys()) {
      const point = SdExcelUtil.parseAddr(addr);

      range = {
        s: { r: Math.min(point.r, range.s.r), c: Math.min(point.c, range.s.c) },
        e: { r: Math.max(point.r, range.e.r), c: Math.max(point.c, range.e.c) }
      };
    }

    this.data.worksheet.dimension[0].$.ref = SdExcelUtil.stringifyRangeAddr(range);
  }
}
