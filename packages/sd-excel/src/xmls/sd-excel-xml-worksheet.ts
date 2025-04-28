import {  ISdExcelAddressRangePoint,
  ISdExcelCellData,
  ISdExcelRowData,
  ISdExcelXml,
  ISdExcelXmlWorksheetData,
} from "../types";
import { SdExcelUtils } from "../utils/sd-excel.utils";
import { NumberUtils, ObjectUtils } from "@simplysm/sd-core-common";

export class SdExcelXmlWorksheet implements ISdExcelXml {
  data: ISdExcelXmlWorksheetData;

  #rowDataMap = new Map<string, ISdExcelRowData>();
  #cellDataMap = new Map<string, ISdExcelCellData>();

  range!: ISdExcelAddressRangePoint;

  constructor(data?: ISdExcelXmlWorksheetData) {
    if (data === undefined) {
      this.data = {
        "worksheet": {
          "$": {
            "xmlns": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
          },
          "dimension": [
            {
              "$": {
                "ref": "A1",
              },
            },
          ],
          "sheetData": [{}],
        },
      };
    }
    else {
      this.data = data;
    }

    for (const row of this.data.worksheet.sheetData[0].row ?? []) {
      this.#rowDataMap.set(row.$.r, row);

      if (row.c === undefined) continue;
      for (const cell of row.c) {
        this.#cellDataMap.set(cell.$.r, cell);
      }
    }

    if (this.data.worksheet.dimension !== undefined) {
      const ref = this.data.worksheet.dimension[0].$.ref;
      this.range = SdExcelUtils.parseRangeAddr(ref);
    }
    else {
      this.#refreshDimension();
    }
  }

  setCellType(addr: string, type: "s" | "b" | "str" | undefined): void {
    const cellData = this.#getOrCreateCellData(addr);
    if (type) {
      cellData.$.t = type;
    }
    else {
      delete cellData.$.t;
    }
  }

  getCellType(addr: string): string | undefined {
    return this.#getCellData(addr)?.$.t;
  }

  setCellVal(addr: string, val: string | undefined): void {
    const cellData = this.#getOrCreateCellData(addr);
    if (val === undefined) {
      delete cellData.v;
    }
    else {
      cellData.v = [val];
    }
  }

  getCellVal(addr: string): string | undefined {
    const cellData = this.#getCellData(addr);
    const val = cellData?.v?.[0]
      ?? cellData?.is?.[0]?.t?.[0]?._;
    return typeof val === "string" ? val : undefined;
  }

  setCellFormula(addr: string, val: string | undefined): void {
    const cellData = this.#getOrCreateCellData(addr);
    if (val === undefined) {
      delete cellData.f;
    }
    else {
      cellData.f = [val];
    }
  }

  getCellFormula(addr: string): string | undefined {
    const val = this.#getCellData(addr)?.f?.[0];
    return typeof val === "string" ? val : undefined;
  }

  getCellStyleId(addr: string): string | undefined {
    return this.#getCellData(addr)?.$.s;
  }

  setCellStyleId(addr: string, styleId: string | undefined): void {
    if (styleId != null) {
      this.#getOrCreateCellData(addr).$.s = styleId;
    }
    else {
      delete this.#getOrCreateCellData(addr).$.s;
    }
  }

  deleteCell(addr: string): void {
    // ROW 없으면 무효
    const rowAddr = (/\d*$/).exec(addr)![0];
    const rowData = this.#rowDataMap.get(rowAddr);
    if (rowData === undefined) return;

    // CELL 없으면 무효
    const cellData = this.#cellDataMap.get(addr);
    if (cellData === undefined) return;

    // CELL 삭제
    const cellsData = rowData.c!;
    cellsData.remove(cellData);
    this.#cellDataMap.delete(addr);

    // 마지막 CELL이면 ROW도 삭제
    const rowsData = this.data.worksheet.sheetData[0].row!;
    if (cellsData.length === 0) {
      rowsData.remove(rowData);
      this.#rowDataMap.delete(rowAddr);
    }

    // ROW가 없으면 XML의 row부분 자체를 삭제
    if (rowsData.length === 0) {
      delete this.data.worksheet.sheetData[0].row;
    }

    // RANGE 새로고침
    this.#refreshDimension();
  }

  setMergeCells(startAddr: string, endAddr: string): void {
    const mergeCells = this.data.worksheet.mergeCells = this.data.worksheet.mergeCells ?? [
      {
        "$": { count: "0" },
        "mergeCell": [],
      },
    ];

    const newRange = {
      s: SdExcelUtils.parseAddr(startAddr),
      e: SdExcelUtils.parseAddr(endAddr),
    };

    // 머지 겹침 체크
    const existingMergeCells = mergeCells[0].mergeCell;
    for (const mergeCell of existingMergeCells) {
      const [existingStart, existingEnd] = mergeCell.$.ref.split(":");
      const existingRange = {
        s: SdExcelUtils.parseAddr(existingStart),
        e: SdExcelUtils.parseAddr(existingEnd),
      };

      if (
        newRange.s.r <= existingRange.e.r &&
        newRange.e.r >= existingRange.s.r &&
        newRange.s.c <= existingRange.e.c &&
        newRange.e.c >= existingRange.s.c
      ) {
        throw new Error(`Merge cells cannot overlap with existing merged range ${mergeCell.$.ref} with ${startAddr}:${endAddr}`);
      }
    }

    mergeCells[0].mergeCell.push({ "$": { "ref": `${startAddr}:${endAddr}` } });
    mergeCells[0].$.count = mergeCells[0].mergeCell.length.toString();

    const startPoint = SdExcelUtils.parseAddr(startAddr);
    const endPoint = SdExcelUtils.parseAddr(endAddr);

    // 시작셀외 모든셀 삭제

    for (let r = startPoint.r; r <= endPoint.r; r++) {
      for (let c = startPoint.c; c <= endPoint.c; c++) {
        const currentAddr = SdExcelUtils.stringifyAddr({ r, c });
        if (currentAddr !== startAddr) {
          this.deleteCell(currentAddr);
        }
      }
    }

    // RANGE 새로고침

    this.range = {
      s: {
        r: Math.min(startPoint.r, endPoint.r, this.range.s.r),
        c: Math.min(startPoint.c, endPoint.c, this.range.s.c),
      },
      e: {
        r: Math.max(startPoint.r, endPoint.r, this.range.e.r),
        c: Math.max(startPoint.c, endPoint.c, this.range.e.c),
      },
    };
  }

  getMergeCells(): { startAddr: string, endAddr: string }[] {
    const mergeCells = this.data.worksheet.mergeCells;
    if (mergeCells === undefined) return [];

    return mergeCells[0].mergeCell.map((item) => {
      const [startAddr, endAddr] = item.$.ref.split(":");
      return { startAddr, endAddr };
    });
  }

  removeMergeCells(fromAddr: string, toAddr: string): void {
    if (!this.data.worksheet.mergeCells) return;

    const fromPoint = SdExcelUtils.parseAddr(fromAddr);
    const toPoint = SdExcelUtils.parseAddr(toAddr);

    const range = {
      s: {
        r: Math.min(fromPoint.r, toPoint.r),
        c: Math.min(fromPoint.c, toPoint.c),
      },
      e: {
        r: Math.max(fromPoint.r, toPoint.r),
        c: Math.max(fromPoint.c, toPoint.c),
      },
    };

    const filteredMergeCells = this.data.worksheet.mergeCells[0].mergeCell.filter((item) => {
      const rangeAddr = SdExcelUtils.parseRangeAddr(item.$.ref);
      return !(
        rangeAddr.s.r >= range.s.r && rangeAddr.e.r <= range.e.r &&
        rangeAddr.s.c >= range.s.c && rangeAddr.e.c <= range.e.c
      );
    });

    if (filteredMergeCells.length === 0) {
      delete this.data.worksheet.mergeCells;
    }
    else {
      this.data.worksheet.mergeCells[0].mergeCell = filteredMergeCells;
      this.data.worksheet.mergeCells[0].$.count = filteredMergeCells.length.toString();
    }
  }

  setColWidth(colIndex: string, width: string): void {
    const colIndexNumber = NumberUtils.parseInt(colIndex)!;
    const col = this.data.worksheet.cols?.[0].col.single((item) => NumberUtils.parseInt(item.$.min)!
      <= colIndexNumber
      && NumberUtils.parseInt(item.$.max)!
      >= colIndexNumber);
    if (col) {
      if (col.$.min === col.$.max) {
        col.$.bestFit = "1";
        col.$.customWidth = "1";
        col.$.width = width;
      }
      else {
        const minNumber = NumberUtils.parseInt(col.$.min)!;
        const maxNumber = NumberUtils.parseInt(col.$.max)!;

        let insertIndex = this.data.worksheet.cols![0].col.indexOf(col);

        if (minNumber < colIndexNumber) {
          this.data.worksheet.cols![0].col.insert(insertIndex, {
            "$": {
              "min": col.$.min,
              "max": (colIndexNumber - 1).toString(),
              "bestFit": "1",
              "customWidth": "1",
              "width": width,
            },
          });
          insertIndex++;
        }

        this.data.worksheet.cols![0].col.insert(insertIndex, {
          "$": {
            "min": colIndex,
            "max": colIndex,
            "bestFit": "1",
            "customWidth": "1",
            "width": width,
          },
        });
        insertIndex++;

        if (maxNumber > colIndexNumber) {
          this.data.worksheet.cols![0].col.insert(insertIndex, {
            "$": {
              "min": (colIndexNumber + 1).toString(),
              "max": col.$.max,
              "bestFit": "1",
              "customWidth": "1",
              "width": width,
            },
          });
        }

        this.data.worksheet.cols![0].col.remove(col);
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
          "width": width,
        },
      });
    }
  }

  setZoom(percent: number): void {
    this.data.worksheet.sheetViews = this.data.worksheet.sheetViews
      ?? [{ sheetView: [{ $: { workbookViewId: "0" } }] }];

    this.data.worksheet.sheetViews[0].sheetView[0].$.zoomScale = percent.toString();
  }

  setFix(point: { r?: number; c?: number }): void {
    this.data.worksheet.sheetViews = this.data.worksheet.sheetViews
      ?? [{ sheetView: [{ $: { workbookViewId: "0" } }] }];

    this.data.worksheet.sheetViews[0].sheetView[0].pane = [
      {
        "$": {
          ...point.c != null ? {
            "xSplit": (point.c + 1).toString(),
          } : {},
          ...point.r != null ? {
            "ySplit": (point.r + 1).toString(),
          } : {},
          "topLeftCell": SdExcelUtils.stringifyAddr({
            r: (point.r ?? -1) + 1,
            c: (point.c ?? -1) + 1,
          }),
          "activePane": point.r == null ? "topRight" : point.c == null
            ? "bottomLeft"
            : "bottomRight",
          "state": "frozen",
        },
      },
    ];

    if (point.r != null) {
    }
  }

  copyRow(sourceR: number, targetR: number): void {
    const sourceRowData = this.#rowDataMap.get((sourceR + 1).toString())!;
    const targetRowData = this.#rowDataMap.get((targetR + 1).toString());

    const rowData: ISdExcelRowData = {
      ...ObjectUtils.clone(sourceRowData),
      $: { ...ObjectUtils.clone(sourceRowData.$), r: (targetR + 1).toString() },
    };
    if (rowData.c) {
      for (const cellData of rowData.c) {
        const colLetter = cellData.$.r.replace(/\d+$/, "");
        cellData.$.r = colLetter + (targetR + 1).toString();
        this.#cellDataMap.set(colLetter + (targetR + 1).toString(), cellData);
      }
    }

    if (targetRowData != null) {
      Object.assign(targetRowData, rowData);
    }
    else {
      const rowsData = this.data.worksheet.sheetData[0].row = this.data.worksheet.sheetData[0].row
        ?? [];
      rowsData.push(rowData);
      this.#rowDataMap.set((targetR + 1).toString(), rowData);
    }


    // Remove existing merge cells in target row
    const mergeCells = this.getMergeCells();
    for (const mergeCell of mergeCells) {
      const startPoint = SdExcelUtils.parseAddr(mergeCell.startAddr);
      const endPoint = SdExcelUtils.parseAddr(mergeCell.endAddr);
      if (startPoint.r <= targetR && endPoint.r >= targetR) {
        this.removeMergeCells(mergeCell.startAddr, mergeCell.endAddr);
      }
    }

    // Copy merged cells from source
    for (const mergeCell of mergeCells) {
      const startPoint = SdExcelUtils.parseAddr(mergeCell.startAddr);
      const endPoint = SdExcelUtils.parseAddr(mergeCell.endAddr);

      if (startPoint.r <= sourceR && endPoint.r >= sourceR) {
        const rowDiff = targetR - sourceR;
        const newStartAddr = SdExcelUtils.stringifyAddr({
          r: startPoint.r + rowDiff,
          c: startPoint.c,
        });
        const newEndAddr = SdExcelUtils.stringifyAddr({
          r: endPoint.r + rowDiff,
          c: endPoint.c,
        });
        this.setMergeCells(newStartAddr, newEndAddr);
      }
    }
  }

  copyCell(sourceAddr: string, targetAddr: string): void {
    // ROW
    const sourceRowAddr = (/\d*$/).exec(sourceAddr)![0];
    const targetRowAddr = (/\d*$/).exec(targetAddr)![0];

    const sourceRowData = this.#rowDataMap.get(sourceRowAddr)!;
    const targetRowData = this.#rowDataMap.get(targetRowAddr);

    const rowData: ISdExcelRowData = {
      $: { ...ObjectUtils.clone(sourceRowData.$), r: targetRowAddr },
    };

    if (targetRowData != null) {
      for (const key of Object.keys(targetRowData)) {
        delete targetRowData[key];
      }
      targetRowData.$ = rowData.$;
    }
    else {
      const rowsData = this.data.worksheet.sheetData[0].row = this.data.worksheet.sheetData[0].row
        ?? [];
      rowsData.push(rowData);
      this.#rowDataMap.set(targetRowAddr, rowData);
    }

    // CELL
    const sourceCellData = this.#getCellData(sourceAddr);
    const targetCellData = this.#getCellData(targetAddr);

    const cellData: ISdExcelCellData = sourceCellData ? {
      ...ObjectUtils.clone(sourceCellData),
      $: { ...ObjectUtils.clone(sourceCellData.$), r: targetAddr },
    } : {
      $: { r: targetAddr },
      "v": [""],
    };

    if (targetCellData != null) {
      Object.assign(targetCellData, cellData);
    }
    else {
      const cellsData = rowData.c = rowData.c ?? [];
      cellsData.push(cellData);
      this.#cellDataMap.set(targetAddr, cellData);
    }

    // RANGE 새로고침
    const point = SdExcelUtils.parseAddr(targetAddr);
    this.range = {
      s: { r: Math.min(point.r, this.range.s.r), c: Math.min(point.c, this.range.s.c) },
      e: { r: Math.max(point.r, this.range.e.r), c: Math.max(point.c, this.range.e.c) },
    };
  }

  cleanup(): void {
    const result = {} as ISdExcelXmlWorksheetData["worksheet"];

    // 순서 정렬 ("sheetData"기준 앞뒤로, 나머지는 원래위치대로)

    for (const key of Object.keys(this.data.worksheet)) {
      if (key === "mergeCells") continue;
      if (key === "cols") continue;
      if (key === "sheetViews") continue;
      if (key === "sheetFormatPr") continue;

      if (key === "sheetData") {
        if (this.data.worksheet.sheetViews) {
          result.sheetViews = this.data.worksheet.sheetViews;
        }
        if (this.data.worksheet.sheetFormatPr) {
          result.sheetFormatPr = this.data.worksheet.sheetFormatPr;
        }
        if (this.data.worksheet.cols) {
          result.cols = this.data.worksheet.cols;
        }
        result.sheetData = this.data.worksheet.sheetData;

        if (this.data.worksheet.mergeCells) {
          result.mergeCells = this.data.worksheet.mergeCells;
        }
      }
      else {
        result[key] = this.data.worksheet[key];
      }
    }

    // ROW 정렬
    const rowsData = result.sheetData[0].row = result.sheetData[0].row
      ?? [];
    rowsData.orderByThis((item) => NumberUtils.parseInt(item.$.r));

    // CELL 정렬
    for (const rowData of rowsData) {
      const cellsData = rowData.c;
      if (!cellsData) continue;
      cellsData.orderByThis((item) => SdExcelUtils.parseAddr(item.$.r).c);
    }

    // Dimension 값 적용
    if (result.dimension) {
      result.dimension[0].$.ref = SdExcelUtils.stringifyRangeAddr(this.range);
    }
    else {
      result.dimension = [{ "$": { "ref": SdExcelUtils.stringifyRangeAddr(this.range) } }];
    }

    this.data.worksheet = result;
  }

  #getCellData(addr: string): ISdExcelCellData | undefined {
    return this.#cellDataMap.get(addr);
  }

  #getOrCreateCellData(addr: string): ISdExcelCellData {
    // ROW 없으면 만들기
    const rowAddr = (/\d*$/).exec(addr)![0];
    let rowData = this.#rowDataMap.get(rowAddr);
    if (rowData === undefined) {
      const rowsData = this.data.worksheet.sheetData[0].row = this.data.worksheet.sheetData[0].row
        ?? [];

      rowData = { "$": { "r": rowAddr }, c: [] };
      rowsData.push(rowData);
      this.#rowDataMap.set(rowAddr, rowData);
    }

    // CELL 없으면 만들기
    let cellData = this.#cellDataMap.get(addr);
    if (cellData === undefined) {
      rowData.c = rowData.c ?? [];
      const cellsData = rowData.c;

      cellData = { "$": { "r": addr }, "v": [""] };
      cellsData.push(cellData);
      this.#cellDataMap.set(addr, cellData);

      const point = SdExcelUtils.parseAddr(addr);

      // RANGE 새로고침
      this.range = {
        s: { r: Math.min(point.r, this.range.s.r), c: Math.min(point.c, this.range.s.c) },
        e: { r: Math.max(point.r, this.range.e.r), c: Math.max(point.c, this.range.e.c) },
      };
    }

    return cellData;
  }

  #refreshDimension(): void {
    if (this.#cellDataMap.size === 0) {
      this.range = {
        s: { r: 0, c: 0 },
        e: { r: 0, c: 0 },
      };
    }
    else {
      this.range = {
        s: { r: Number.MAX_VALUE, c: Number.MAX_VALUE },
        e: { r: 0, c: 0 },
      };

      for (const addr of this.#cellDataMap.keys()) {
        const point = SdExcelUtils.parseAddr(addr);

        this.range = {
          s: { r: Math.min(point.r, this.range.s.r), c: Math.min(point.c, this.range.s.c) },
          e: { r: Math.max(point.r, this.range.e.r), c: Math.max(point.c, this.range.e.c) },
        };
      }
    }
  }
}
