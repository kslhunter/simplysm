import {
  ISdExcelAddressRangePoint,
  ISdExcelCellData,
  ISdExcelRowData,
  ISdExcelXml,
  ISdExcelXmlWorksheetData
} from "../commons";
import { SdExcelUtil } from "../utils/SdExcelUtil";
import { NotImplementError, NumberUtil } from "@simplysm/sd-core-common";

export class SdExcelXmlWorksheet implements ISdExcelXml {
  public readonly data: ISdExcelXmlWorksheetData;

  private readonly _rowDataMap = new Map<string, ISdExcelRowData>();
  private readonly _cellDataMap = new Map<string, ISdExcelCellData>();

  public range!: ISdExcelAddressRangePoint;

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

      if (row.c === undefined) continue;
      for (const cell of row.c) {
        this._cellDataMap.set(cell.$.r, cell);
      }
    }

    if (this.data.worksheet.dimension !== undefined) {
      const ref = this.data.worksheet.dimension[0].$.ref;
      this.range = SdExcelUtil.parseRangeAddr(ref);
    }
    else {
      this._refreshDimension();
    }
  }

  public setCellType(addr: string, type: "s" | "b" | undefined): void {
    const cellData = this._getOrCreateCellData(addr);
    if (type) {
      cellData.$.t = type;
    }
    else {
      delete cellData.$.t;
    }
  }

  public getCellType(addr: string): string | undefined {
    return this._getCellData(addr)?.$.t;
  }

  public setCellVal(addr: string, val: string): void {
    const cellData = this._getOrCreateCellData(addr);
    cellData.v = [val];
  }

  public getCellVal(addr: string): string | undefined {
    return this._getCellData(addr)?.v?.[0];
  }

  public getCellStyleId(addr: string): string | undefined {
    return this._getCellData(addr)?.$.s;
  }

  public setCellStyleId(addr: string, styleId: string): void {
    this._getOrCreateCellData(addr).$.s = styleId;
  }

  public deleteCell(addr: string): void {
    // ROW 없으면 무효
    const rowAddr = (/\d*$/).exec(addr)![0];
    const rowData = this._rowDataMap.get(rowAddr);
    if (rowData === undefined) return;

    // CELL 없으면 무효
    const cellData = this._cellDataMap.get(addr);
    if (cellData === undefined) return;

    // CELL 삭제
    const cellsData = rowData.c!;
    cellsData.remove(cellData);
    this._cellDataMap.delete(addr);

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

  public setMergeCells(startAddr: string, endAddr: string): void {
    const mergeCells = this.data.worksheet.mergeCells = this.data.worksheet.mergeCells ?? [{
      "$": { count: "0" },
      "mergeCell": []
    }];

    mergeCells[0].mergeCell.push({ "$": { "ref": `${startAddr}:${endAddr}` } });
    mergeCells[0].$.count = mergeCells[0].mergeCell.length.toString();

    // RANGE 새로고침
    const startPoint = SdExcelUtil.parseAddr(startAddr);
    const endPoint = SdExcelUtil.parseAddr(endAddr);

    this.range = {
      s: {
        r: Math.min(startPoint.r, endPoint.r, this.range.s.r),
        c: Math.min(startPoint.c, endPoint.c, this.range.s.c)
      },
      e: {
        r: Math.max(startPoint.r, endPoint.r, this.range.e.r),
        c: Math.max(startPoint.c, endPoint.c, this.range.e.c)
      }
    };
  }

  public setColWidth(colIndex: string, width: string): void {
    const colIndexNumber = NumberUtil.parseInt(colIndex)!;
    const col = this.data.worksheet.cols?.[0].col.single((item) => NumberUtil.parseInt(item.$.min)! <= colIndexNumber && NumberUtil.parseInt(item.$.max)! >= colIndexNumber);
    if (col) {
      if (col.$.min === col.$.max) {
        col.$.bestFit = "1";
        col.$.customWidth = "1";
        col.$.width = width;
      }
      else {
        throw new NotImplementError();
      }
    }
    else {
      this.data.worksheet.cols = this.data.worksheet.cols ?? [{ col: [] }];
      this.data.worksheet.cols[0].col.push({
        "$": {
          "min": colIndex,
          "max": colIndex,
          "bestFit": "1",
          "customWidth": "1",
          "width": width
        }
      });
    }
  }

  public cleanup(): void {
    //-- 순서 정렬
    const wsData = { worksheet: {} } as ISdExcelXmlWorksheetData;
    const keys = Object.keys(this.data.worksheet);
    for (let i = 0; i < keys.length; i++) {
      if (keys[i] === "mergeCells") continue;
      if (keys[i] === "cols") continue;

      if (keys[i] === "sheetData") {
        // cols
        if (this.data.worksheet.cols) {
          wsData.worksheet.cols = this.data.worksheet.cols;
        }

        // sheetData
        wsData.worksheet[keys[i]] = this.data.worksheet[keys[i]];

        // mergeCells
        if (this.data.worksheet.mergeCells) {
          wsData.worksheet.mergeCells = this.data.worksheet.mergeCells;
        }
      }
      else {
        wsData.worksheet[keys[i]] = this.data.worksheet[keys[i]];
      }
    }
    this.data.worksheet = wsData.worksheet;

    // ROW 정렬
    const rowsData = this.data.worksheet.sheetData[0].row = this.data.worksheet.sheetData[0].row ?? [];
    rowsData.orderByThis((item) => NumberUtil.parseInt(item.$.r));

    // CELL 정렬
    for (const rowData of rowsData) {
      const cellsData = rowData.c;
      if (!cellsData) continue;
      cellsData.orderByThis((item) => SdExcelUtil.parseAddr(item.$.r).c);
    }

    // Dimension 값 적용
    if (this.data.worksheet.dimension) {
      this.data.worksheet.dimension[0].$.ref = SdExcelUtil.stringifyRangeAddr(this.range);
    }
    else {
      this.data.worksheet.dimension = [{ "$": { "ref": SdExcelUtil.stringifyRangeAddr(this.range) } }];
    }
  }

  private _getCellData(addr: string): ISdExcelCellData | undefined {
    return this._cellDataMap.get(addr);
  }

  private _getOrCreateCellData(addr: string): ISdExcelCellData {
    // ROW 없으면 만들기
    const rowAddr = (/\d*$/).exec(addr)![0];
    let rowData = this._rowDataMap.get(rowAddr);
    if (rowData === undefined) {
      const rowsData = this.data.worksheet.sheetData[0].row = this.data.worksheet.sheetData[0].row ?? [];

      rowData = { "$": { "r": rowAddr }, c: [] };
      rowsData.push(rowData);
      this._rowDataMap.set(rowAddr, rowData);
    }

    // CELL 없으면 만들기
    let cellData = this._cellDataMap.get(addr);
    if (cellData === undefined) {
      rowData.c = rowData.c ?? [];
      const cellsData = rowData.c;

      cellData = { "$": { "r": addr }, "v": [""] };
      cellsData.push(cellData);
      this._cellDataMap.set(addr, cellData);

      const point = SdExcelUtil.parseAddr(addr);

      // RANGE 새로고침
      this.range = {
        s: { r: Math.min(point.r, this.range.s.r), c: Math.min(point.c, this.range.s.c) },
        e: { r: Math.max(point.r, this.range.e.r), c: Math.max(point.c, this.range.e.c) }
      };
    }

    return cellData;
  }

  private _refreshDimension(): void {
    if (this._cellDataMap.size === 0) {
      this.range = {
        s: { r: 0, c: 0 },
        e: { r: 0, c: 0 }
      };
    }
    else {
      this.range = {
        s: { r: Number.MAX_VALUE, c: Number.MAX_VALUE },
        e: { r: 0, c: 0 }
      };

      for (const addr of this._cellDataMap.keys()) {
        const point = SdExcelUtil.parseAddr(addr);

        this.range = {
          s: { r: Math.min(point.r, this.range.s.r), c: Math.min(point.c, this.range.s.c) },
          e: { r: Math.max(point.r, this.range.e.r), c: Math.max(point.c, this.range.e.c) }
        };
      }
    }
  }
}
