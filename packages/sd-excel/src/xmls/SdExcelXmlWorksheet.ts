import type {
  ISdExcelAddressRangePoint,
  ISdExcelCellData,
  ISdExcelRowData,
  ISdExcelXml,
  ISdExcelXmlWorksheetData,
} from "../types";
import { SdExcelUtils } from "../utils/SdExcelUtils";
import { NumberUtils, ObjectUtils } from "@simplysm/sd-core-common";

export class SdExcelXmlWorksheet implements ISdExcelXml {
  data: ISdExcelXmlWorksheetData;

  private readonly _dataMap = new Map<number, IRowInfo>();

  constructor(data?: ISdExcelXmlWorksheetData) {
    if (data === undefined) {
      this.data = {
        worksheet: {
          $: {
            xmlns: "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
          },
          dimension: [
            {
              $: {
                ref: "A1",
              },
            },
          ],
          sheetData: [{}],
        },
      };
    } else {
      this.data = data;
    }

    this._dataMap = (this.data.worksheet.sheetData[0].row ?? []).toMap(
      (row) => SdExcelUtils.parseRowAddrCode(row.$.r),
      (row) => ({
        data: row,
        cellMap: (row.c ?? []).toMap(
          (cell) => SdExcelUtils.parseColAddrCode(cell.$.r),
          (cell) => cell,
        ),
      }),
    );
  }

  get range(): ISdExcelAddressRangePoint {
    let maxRow = 0;
    let maxCol = 0;

    for (const [rowIdx, info] of this._dataMap.entries()) {
      if (rowIdx > maxRow) maxRow = rowIdx;

      for (const col of info.cellMap.keys()) {
        if (col > maxCol) maxCol = col;
      }
    }

    return {
      s: { r: 0, c: 0 },
      e: { r: maxRow, c: maxCol },
    };
  }

  setCellType(addr: { r: number; c: number }, type: "s" | "b" | "str" | undefined): void {
    const cellData = this._getOrCreateCellData(addr);
    if (type) {
      cellData.$.t = type;
    } else {
      delete cellData.$.t;
    }
  }

  getCellType(addr: { r: number; c: number }): string | undefined {
    return this._getCellData(addr)?.$.t;
  }

  setCellVal(addr: { r: number; c: number }, val: string | undefined): void {
    const cellData = this._getOrCreateCellData(addr);
    if (val === undefined) {
      delete cellData.v;
    } else {
      cellData.v = [val];
    }
  }

  getCellVal(addr: { r: number; c: number }): string | undefined {
    const cellData = this._getCellData(addr);
    const val = cellData?.v?.[0] ?? cellData?.is?.[0]?.t?.[0]?._;
    return typeof val === "string" ? val : undefined;
  }

  setCellFormula(addr: { r: number; c: number }, val: string | undefined): void {
    const cellData = this._getOrCreateCellData(addr);
    if (val === undefined) {
      delete cellData.f;
    } else {
      cellData.f = [val];
    }
  }

  getCellFormula(addr: { r: number; c: number }): string | undefined {
    const val = this._getCellData(addr)?.f?.[0];
    return typeof val === "string" ? val : undefined;
  }

  getCellStyleId(addr: { r: number; c: number }): string | undefined {
    return this._getCellData(addr)?.$.s;
  }

  setCellStyleId(addr: { r: number; c: number }, styleId: string | undefined): void {
    if (styleId != null) {
      this._getOrCreateCellData(addr).$.s = styleId;
    } else {
      delete this._getOrCreateCellData(addr).$.s;
    }
  }

  deleteCell(addr: { r: number; c: number }) {
    // ROW 없으면 무효
    const rowInfo = this._dataMap.get(addr.r);
    if (!rowInfo) return;

    // CELL 업으면 무효
    const cellData = rowInfo.cellMap.get(addr.c);
    if (!cellData) return;

    // CELL 삭제
    const cellsData = rowInfo.data.c!;
    cellsData.remove(cellData);
    rowInfo.cellMap.delete(addr.c);

    // 마지막 CELL이면 ROW도 삭제
    if (rowInfo.cellMap.size === 0) {
      this._deleteRow(addr.r);
    }
  }

  setMergeCells(startAddr: { r: number; c: number }, endAddr: { r: number; c: number }): void {
    const mergeCells = (this.data.worksheet.mergeCells = this.data.worksheet.mergeCells ?? [
      {
        $: { count: "0" },
        mergeCell: [],
      },
    ]);

    const newRange = { s: startAddr, e: endAddr };

    // 머지 겹침 체크
    const existingMergeCells = mergeCells[0].mergeCell;
    for (const mergeCell of existingMergeCells) {
      const existingRange = SdExcelUtils.parseRangeAddrCode(mergeCell.$.ref);

      if (
        newRange.s.r <= existingRange.e.r &&
        newRange.e.r >= existingRange.s.r &&
        newRange.s.c <= existingRange.e.c &&
        newRange.e.c >= existingRange.s.c
      ) {
        throw new Error(
          `Merge cells cannot overlap with existing merged range ${mergeCell.$.ref} with ${startAddr}:${endAddr}`,
        );
      }
    }

    mergeCells[0].mergeCell.push({ $: { ref: SdExcelUtils.stringifyRangeAddr(newRange) } });
    mergeCells[0].$.count = mergeCells[0].mergeCell.length.toString();

    // 시작셀외 모든셀 삭제

    for (let r = startAddr.r; r <= endAddr.r; r++) {
      for (let c = startAddr.c; c <= endAddr.c; c++) {
        const currentAddr = { r, c };
        if (currentAddr.r !== startAddr.r || currentAddr.c !== startAddr.c) {
          this.deleteCell(currentAddr);
        }
      }
    }
  }

  getMergeCells(): { s: { r: number; c: number }; e: { r: number; c: number } }[] {
    const mergeCells = this.data.worksheet.mergeCells;
    if (mergeCells === undefined) return [];
    return mergeCells[0].mergeCell.map((item) => SdExcelUtils.parseRangeAddrCode(item.$.ref));
  }

  removeMergeCells(fromAddr: { r: number; c: number }, toAddr: { r: number; c: number }): void {
    if (!this.data.worksheet.mergeCells) return;

    const range = { s: fromAddr, e: toAddr };

    const filteredMergeCells = this.data.worksheet.mergeCells[0].mergeCell.filter((item) => {
      const rangeAddr = SdExcelUtils.parseRangeAddrCode(item.$.ref);
      return !(
        rangeAddr.s.r >= range.s.r &&
        rangeAddr.e.r <= range.e.r &&
        rangeAddr.s.c >= range.s.c &&
        rangeAddr.e.c <= range.e.c
      );
    });

    if (filteredMergeCells.length === 0) {
      delete this.data.worksheet.mergeCells;
    } else {
      this.data.worksheet.mergeCells[0].mergeCell = filteredMergeCells;
      this.data.worksheet.mergeCells[0].$.count = filteredMergeCells.length.toString();
    }
  }

  setColWidth(colIndex: string, width: string): void {
    const colIndexNumber = NumberUtils.parseInt(colIndex)!;
    const col = this.data.worksheet.cols?.[0].col.single(
      (item) =>
        NumberUtils.parseInt(item.$.min)! <= colIndexNumber &&
        NumberUtils.parseInt(item.$.max)! >= colIndexNumber,
    );

    if (col) {
      if (col.$.min === col.$.max) {
        col.$.bestFit = "1";
        col.$.customWidth = "1";
        col.$.width = width;
      } else {
        const minNumber = NumberUtils.parseInt(col.$.min)!;
        const maxNumber = NumberUtils.parseInt(col.$.max)!;

        let insertIndex = this.data.worksheet.cols![0].col.indexOf(col);

        if (minNumber < colIndexNumber) {
          this.data.worksheet.cols![0].col.insert(insertIndex, {
            $: {
              min: col.$.min,
              max: (colIndexNumber - 1).toString(),
              bestFit: "1",
              customWidth: "1",
              width: width,
            },
          });
          insertIndex++;
        }

        this.data.worksheet.cols![0].col.insert(insertIndex, {
          $: {
            min: colIndex,
            max: colIndex,
            bestFit: "1",
            customWidth: "1",
            width: width,
          },
        });
        insertIndex++;

        if (maxNumber > colIndexNumber) {
          this.data.worksheet.cols![0].col.insert(insertIndex, {
            $: {
              min: (colIndexNumber + 1).toString(),
              max: col.$.max,
              bestFit: "1",
              customWidth: "1",
              width: width,
            },
          });
        }

        this.data.worksheet.cols![0].col.remove(col);
      }
    } else {
      this.data.worksheet.cols = this.data.worksheet.cols ?? [{ col: [] }];
      this.data.worksheet.cols[0].col.push({
        $: {
          min: colIndex,
          max: colIndex,
          bestFit: "1",
          customWidth: "1",
          width: width,
        },
      });
    }
  }

  setZoom(percent: number): void {
    this.data.worksheet.sheetViews = this.data.worksheet.sheetViews ?? [
      { sheetView: [{ $: { workbookViewId: "0" } }] },
    ];

    this.data.worksheet.sheetViews[0].sheetView[0].$.zoomScale = percent.toString();
  }

  setFix(point: { r?: number; c?: number }): void {
    this.data.worksheet.sheetViews = this.data.worksheet.sheetViews ?? [
      { sheetView: [{ $: { workbookViewId: "0" } }] },
    ];

    this.data.worksheet.sheetViews[0].sheetView[0].pane = [
      {
        $: {
          ...(point.c != null
            ? {
                xSplit: (point.c + 1).toString(),
              }
            : {}),
          ...(point.r != null
            ? {
                ySplit: (point.r + 1).toString(),
              }
            : {}),
          topLeftCell: SdExcelUtils.stringifyAddr({
            r: (point.r ?? -1) + 1,
            c: (point.c ?? -1) + 1,
          }),
          activePane: point.r == null ? "topRight" : point.c == null ? "bottomLeft" : "bottomRight",
          state: "frozen",
        },
      },
    ];

    if (point.r != null) {
    }
  }

  copyRow(sourceR: number, targetR: number): void {
    // 출발지ROW 데이터 복제
    const sourceRowInfo = this._dataMap.get(sourceR);

    if (sourceRowInfo) {
      // rowData 복제
      const newRowData: ISdExcelRowData = ObjectUtils.clone(sourceRowInfo.data);

      // ROW 주소 변경
      newRowData.$.r = SdExcelUtils.stringifyRowAddr(targetR);

      // 각 CELL 주소 변경
      if (newRowData.c) {
        for (const cellData of newRowData.c) {
          const colAddr = SdExcelUtils.parseColAddrCode(cellData.$.r);
          cellData.$.r = SdExcelUtils.stringifyAddr({ r: targetR, c: colAddr });
        }
      }

      this._replaceRowData(targetR, newRowData);
    } else {
      this._deleteRow(targetR);
    }

    // Remove existing merge cells in target row
    const mergeCells = this.getMergeCells();
    for (const mergeCell of mergeCells) {
      if (mergeCell.s.r <= targetR && mergeCell.e.r >= targetR) {
        this.removeMergeCells(mergeCell.s, mergeCell.e);
      }
    }

    // Copy merged cells from source
    for (const mergeCell of mergeCells) {
      if (mergeCell.s.r <= sourceR && mergeCell.e.r >= sourceR) {
        const rowDiff = targetR - sourceR;
        const newStartAddr = { r: mergeCell.s.r + rowDiff, c: mergeCell.s.c };
        const newEndAddr = { r: mergeCell.e.r + rowDiff, c: mergeCell.e.c };
        this.setMergeCells(newStartAddr, newEndAddr);
      }
    }
  }

  copyCell(sourceAddr: { r: number; c: number }, targetAddr: { r: number; c: number }): void {
    const sourceCellData = this._getCellData(sourceAddr);

    if (sourceCellData) {
      const newCellData = ObjectUtils.clone(sourceCellData);
      newCellData.$.r = SdExcelUtils.stringifyAddr(targetAddr);
      this._replaceCellData(targetAddr, newCellData);
    } else {
      this.deleteCell(targetAddr);
    }
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
      } else {
        const worksheetRec = this.data.worksheet as Record<string, any>;
        const resultRec = result as Record<string, any>;
        resultRec[key] = worksheetRec[key];
      }
    }

    // ROW 정렬
    const rowsData = (result.sheetData[0].row = result.sheetData[0].row ?? []);
    rowsData.orderByThis((item) => NumberUtils.parseInt(item.$.r));

    // CELL 정렬
    for (const rowData of rowsData) {
      const cellsData = rowData.c;
      if (!cellsData) continue;
      cellsData.orderByThis((item) => SdExcelUtils.parseCellAddrCode(item.$.r).c);
    }

    // Dimension 값 적용
    if (result.dimension) {
      result.dimension[0].$.ref = SdExcelUtils.stringifyRangeAddr(this.range);
    } else {
      result.dimension = [{ $: { ref: SdExcelUtils.stringifyRangeAddr(this.range) } }];
    }

    this.data.worksheet = result;
  }

  private _getCellData(addr: { r: number; c: number }): ISdExcelCellData | undefined {
    return this._dataMap.get(addr.r)?.cellMap.get(addr.c);
  }

  private _getOrCreateCellData(addr: { r: number; c: number }): ISdExcelCellData {
    // ROW 없으면 만들기
    let rowInfo = this._getOrCreateRowInfo(addr.r);

    // CELL 없으면 만들기
    let cellData = rowInfo.cellMap.get(addr.c);
    if (cellData === undefined) {
      rowInfo.data.c = rowInfo.data.c ?? [];

      cellData = { $: { r: SdExcelUtils.stringifyAddr(addr) }, v: [""] };
      rowInfo.data.c.push(cellData);
      rowInfo.cellMap.set(addr.c, cellData);
    }

    return cellData;
  }

  private _getOrCreateRowInfo(r: number): IRowInfo {
    let rowInfo = this._dataMap.get(r);
    if (!rowInfo) {
      return this._replaceRowData(r, { $: { r: SdExcelUtils.stringifyRowAddr(r) }, c: [] });
    }
    return rowInfo;
  }

  private _replaceRowData(r: number, rowData: ISdExcelRowData): IRowInfo {
    this._deleteRow(r);

    // sheet에 기록
    this.data.worksheet.sheetData[0].row = this.data.worksheet.sheetData[0].row ?? [];
    this.data.worksheet.sheetData[0].row.push(rowData);

    // cache에 기록
    const rowInfo = {
      data: rowData,
      cellMap: (rowData.c ?? []).toMap(
        (cell) => SdExcelUtils.parseColAddrCode(cell.$.r),
        (cell) => cell,
      ),
    };
    this._dataMap.set(r, rowInfo);

    return rowInfo;
  }

  private _replaceCellData(addr: { r: number; c: number }, cellData: ISdExcelCellData): void {
    this.deleteCell(addr);

    // ROW
    const targetRowInfo = this._getOrCreateRowInfo(addr.r);

    // sheet에 기록
    targetRowInfo.data.c = targetRowInfo.data.c ?? [];
    targetRowInfo.data.c.push(cellData);

    // cache에 기록
    targetRowInfo.cellMap.set(addr.c, cellData);
  }

  private _deleteRow(r: number) {
    const targetRowInfo = this._dataMap.get(r);
    if (targetRowInfo) {
      this.data.worksheet.sheetData[0].row?.remove(targetRowInfo.data);
    }
    this._dataMap.delete(r);

    // ROW가 하나도 없으면 XML의 row부분 자체를 삭제
    if (this.data.worksheet.sheetData[0].row?.length === 0) {
      delete this.data.worksheet.sheetData[0].row;
    }
  }
}

interface IRowInfo {
  data: ISdExcelRowData;
  cellMap: Map<number, ISdExcelCellData>;
}
