import type {
  ExcelAddressRangePoint,
  ExcelCellData,
  ExcelCellType,
  ExcelRowData,
  ExcelXml,
  ExcelXmlWorksheetData,
} from "../types";
import { ExcelUtils } from "../utils/excel-utils";
import { numParseInt, objClone } from "@simplysm/core-common";
import "@simplysm/core-common";

interface RowInfo {
  data: ExcelRowData;
  cellMap: Map<number, ExcelCellData>;
}

/**
 * Class managing xl/worksheets/sheet*.xml files.
 * Handles cell data, merges, column widths, row heights, etc.
 */
export class ExcelXmlWorksheet implements ExcelXml {
  data: ExcelXmlWorksheetData;

  private readonly _dataMap: Map<number, RowInfo>;

  constructor(data?: ExcelXmlWorksheetData) {
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
      (row) => ExcelUtils.parseRowAddrCode(row.$.r),
      (row) => ({
        data: row,
        cellMap: (row.c ?? []).toMap(
          (cell) => ExcelUtils.parseColAddrCode(cell.$.r),
          (cell) => cell,
        ),
      }),
    );
  }

  get range(): ExcelAddressRangePoint {
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

  setCellType(addr: { r: number; c: number }, type: ExcelCellType | undefined): void {
    const cellData = this._getOrCreateCellData(addr);
    if (type != null) {
      cellData.$.t = type;
    } else {
      delete cellData.$.t;
    }
  }

  getCellType(addr: { r: number; c: number }): ExcelCellType | undefined {
    return this._getCellData(addr)?.$.t as ExcelCellType | undefined;
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

  deleteCell(addr: { r: number; c: number }): void {
    // No-op if ROW does not exist
    const rowInfo = this._dataMap.get(addr.r);
    if (rowInfo == null) return;

    // No-op if CELL does not exist
    const cellData = rowInfo.cellMap.get(addr.c);
    if (cellData == null) return;

    // Delete CELL
    const cellsData = rowInfo.data.c!;
    const cellIndex = cellsData.indexOf(cellData);
    if (cellIndex !== -1) cellsData.splice(cellIndex, 1);
    rowInfo.cellMap.delete(addr.c);

    // Delete ROW if it was the last CELL
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

    // Check for merge overlap
    const existingMergeCells = mergeCells[0].mergeCell;
    for (const mergeCell of existingMergeCells) {
      const existingRange = ExcelUtils.parseRangeAddrCode(mergeCell.$.ref);

      if (
        newRange.s.r <= existingRange.e.r &&
        newRange.e.r >= existingRange.s.r &&
        newRange.s.c <= existingRange.e.c &&
        newRange.e.c >= existingRange.s.c
      ) {
        throw new Error(
          `Merged cell overlaps with existing merge range (${mergeCell.$.ref}): ${ExcelUtils.stringifyRangeAddr(newRange)}`,
        );
      }
    }

    mergeCells[0].mergeCell.push({ $: { ref: ExcelUtils.stringifyRangeAddr(newRange) } });
    mergeCells[0].$.count = mergeCells[0].mergeCell.length.toString();

    // Delete all cells except the start cell
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
    return mergeCells[0].mergeCell.map((item) => ExcelUtils.parseRangeAddrCode(item.$.ref));
  }

  removeMergeCells(fromAddr: { r: number; c: number }, toAddr: { r: number; c: number }): void {
    if (this.data.worksheet.mergeCells == null) return;

    const range = { s: fromAddr, e: toAddr };

    const filteredMergeCells = this.data.worksheet.mergeCells[0].mergeCell.filter((item) => {
      const rangeAddr = ExcelUtils.parseRangeAddrCode(item.$.ref);
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

  /**
   * Set width of a specific column.
   *
   * @internal
   * Use ExcelCol.setWidth() externally.
   *
   * @param colIndex Column index (1-based, string)
   * @param width Width to set
   */
  setColWidth(colIndex: string, width: string): void {
    const colIndexNumber = numParseInt(colIndex);
    if (colIndexNumber == null) {
      throw new Error(`Invalid column index: ${colIndex}`);
    }

    const cols = this.data.worksheet.cols?.[0];

    // Find existing range containing the target column
    const col = cols
      ? cols.col.single(
          (item) =>
            (numParseInt(item.$.min) ?? 0) <= colIndexNumber &&
            (numParseInt(item.$.max) ?? 0) >= colIndexNumber,
        )
      : undefined;

    if (col != null && cols != null) {
      if (col.$.min === col.$.max) {
        // Single column range: update properties of that column only
        col.$.bestFit = "1";
        col.$.customWidth = "1";
        col.$.width = width;
      } else {
        // Multi-column range: split the range and apply new width only to target column
        // e.g.: existing [1~5, width=10], target=3, new width=20
        //     -> [1~2, width=10], [3, width=20], [4~5, width=10]
        const minNumber = numParseInt(col.$.min) ?? 0;
        const maxNumber = numParseInt(col.$.max) ?? 0;

        let insertIndex = cols.col.indexOf(col);

        // Create front range (min ~ colIndex-1): keep original properties
        if (minNumber < colIndexNumber) {
          cols.col.splice(insertIndex, 0, {
            $: {
              ...col.$,
              min: col.$.min,
              max: (colIndexNumber - 1).toString(),
            },
          });
          insertIndex++;
        }

        // Create target column (colIndex): apply new width
        cols.col.splice(insertIndex, 0, {
          $: {
            min: colIndex,
            max: colIndex,
            bestFit: "1",
            customWidth: "1",
            width: width,
          },
        });
        insertIndex++;

        // Create back range (colIndex+1 ~ max): keep original properties
        if (maxNumber > colIndexNumber) {
          cols.col.splice(insertIndex, 0, {
            $: {
              ...col.$,
              min: (colIndexNumber + 1).toString(),
              max: col.$.max,
            },
          });
        }

        // Delete original range
        const colIndex2 = cols.col.indexOf(col);
        if (colIndex2 !== -1) cols.col.splice(colIndex2, 1);
      }
    } else {
      // No existing range: create new range
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
          topLeftCell: ExcelUtils.stringifyAddr({
            r: (point.r ?? -1) + 1,
            c: (point.c ?? -1) + 1,
          }),
          activePane: point.r == null ? "topRight" : point.c == null ? "bottomLeft" : "bottomRight",
          state: "frozen",
        },
      },
    ];
  }

  copyRow(sourceR: number, targetR: number): void {
    // Clone source ROW data
    const sourceRowInfo = this._dataMap.get(sourceR);

    if (sourceRowInfo != null) {
      // Clone rowData
      const newRowData: ExcelRowData = objClone(sourceRowInfo.data);

      // Update ROW address
      newRowData.$.r = ExcelUtils.stringifyRowAddr(targetR);

      // Update each CELL address
      if (newRowData.c != null) {
        for (const cellData of newRowData.c) {
          const colAddr = ExcelUtils.parseColAddrCode(cellData.$.r);
          cellData.$.r = ExcelUtils.stringifyAddr({ r: targetR, c: colAddr });
        }
      }

      this._replaceRowData(targetR, newRowData);
    } else {
      this._deleteRow(targetR);
    }

    // Copy and store source row merge cell info first
    const sourceMergeCells = this.getMergeCells()
      .filter((mc) => mc.s.r <= sourceR && mc.e.r >= sourceR)
      .map((mc) => ({ s: { ...mc.s }, e: { ...mc.e } }));

    // Remove existing merge cells in target row
    for (const mergeCell of this.getMergeCells()) {
      if (mergeCell.s.r <= targetR && mergeCell.e.r >= targetR) {
        this.removeMergeCells(mergeCell.s, mergeCell.e);
      }
    }

    // Copy stored source merge info to target
    for (const mergeCell of sourceMergeCells) {
      const rowDiff = targetR - sourceR;
      const newStartAddr = { r: mergeCell.s.r + rowDiff, c: mergeCell.s.c };
      const newEndAddr = { r: mergeCell.e.r + rowDiff, c: mergeCell.e.c };
      this.setMergeCells(newStartAddr, newEndAddr);
    }
  }

  copyCell(sourceAddr: { r: number; c: number }, targetAddr: { r: number; c: number }): void {
    const sourceCellData = this._getCellData(sourceAddr);

    if (sourceCellData != null) {
      const newCellData = objClone(sourceCellData);
      newCellData.$.r = ExcelUtils.stringifyAddr(targetAddr);
      this._replaceCellData(targetAddr, newCellData);
    } else {
      this.deleteCell(targetAddr);
    }
  }

  cleanup(): void {
    const result = {} as ExcelXmlWorksheetData["worksheet"];

    // Sort order (around "sheetData", keep others in original position)

    for (const key of Object.keys(this.data.worksheet)) {
      if (key === "mergeCells") continue;
      if (key === "cols") continue;
      if (key === "sheetViews") continue;
      if (key === "sheetFormatPr") continue;

      if (key === "sheetData") {
        if (this.data.worksheet.sheetViews != null) {
          result.sheetViews = this.data.worksheet.sheetViews;
        }
        if (this.data.worksheet.sheetFormatPr != null) {
          result.sheetFormatPr = this.data.worksheet.sheetFormatPr;
        }
        if (this.data.worksheet.cols != null) {
          result.cols = this.data.worksheet.cols;
        }
        result.sheetData = this.data.worksheet.sheetData;

        if (this.data.worksheet.mergeCells != null) {
          result.mergeCells = this.data.worksheet.mergeCells;
        }
      } else {
        const worksheetRec = this.data.worksheet as Record<string, unknown>;
        const resultRec = result as Record<string, unknown>;
        resultRec[key] = worksheetRec[key];
      }
    }

    // Sort ROWs
    const rowsData = (result.sheetData[0].row = result.sheetData[0].row ?? []);
    rowsData.sort((a, b) => (numParseInt(a.$.r) ?? 0) - (numParseInt(b.$.r) ?? 0));

    // Sort CELLs
    for (const rowData of rowsData) {
      const cellsData = rowData.c;
      if (cellsData == null) continue;
      cellsData.sort(
        (a, b) => ExcelUtils.parseCellAddrCode(a.$.r).c - ExcelUtils.parseCellAddrCode(b.$.r).c,
      );
    }

    // Apply dimension value
    if (result.dimension != null) {
      result.dimension[0].$.ref = ExcelUtils.stringifyRangeAddr(this.range);
    } else {
      result.dimension = [{ $: { ref: ExcelUtils.stringifyRangeAddr(this.range) } }];
    }

    this.data.worksheet = result;
  }

  private _getCellData(addr: { r: number; c: number }): ExcelCellData | undefined {
    return this._dataMap.get(addr.r)?.cellMap.get(addr.c);
  }

  private _getOrCreateCellData(addr: { r: number; c: number }): ExcelCellData {
    // Create ROW if it does not exist
    const rowInfo = this._getOrCreateRowInfo(addr.r);

    // Create CELL if it does not exist
    let cellData = rowInfo.cellMap.get(addr.c);
    if (cellData === undefined) {
      rowInfo.data.c = rowInfo.data.c ?? [];

      cellData = { $: { r: ExcelUtils.stringifyAddr(addr) }, v: [""] };
      rowInfo.data.c.push(cellData);
      rowInfo.cellMap.set(addr.c, cellData);
    }

    return cellData;
  }

  private _getOrCreateRowInfo(r: number): RowInfo {
    const rowInfo = this._dataMap.get(r);
    if (rowInfo == null) {
      return this._replaceRowData(r, { $: { r: ExcelUtils.stringifyRowAddr(r) }, c: [] });
    }
    return rowInfo;
  }

  private _replaceRowData(r: number, rowData: ExcelRowData): RowInfo {
    this._deleteRow(r);

    // Write to sheet
    this.data.worksheet.sheetData[0].row = this.data.worksheet.sheetData[0].row ?? [];
    this.data.worksheet.sheetData[0].row.push(rowData);

    // Write to cache
    const rowInfo = {
      data: rowData,
      cellMap: (rowData.c ?? []).toMap(
        (cell) => ExcelUtils.parseColAddrCode(cell.$.r),
        (cell) => cell,
      ),
    };
    this._dataMap.set(r, rowInfo);

    return rowInfo;
  }

  private _replaceCellData(addr: { r: number; c: number }, cellData: ExcelCellData): void {
    this.deleteCell(addr);

    // ROW
    const targetRowInfo = this._getOrCreateRowInfo(addr.r);

    // Write to sheet
    targetRowInfo.data.c = targetRowInfo.data.c ?? [];
    targetRowInfo.data.c.push(cellData);

    // Write to cache
    targetRowInfo.cellMap.set(addr.c, cellData);
  }

  private _deleteRow(r: number): void {
    const targetRowInfo = this._dataMap.get(r);
    if (targetRowInfo != null) {
      const rows = this.data.worksheet.sheetData[0].row;
      if (rows) {
        const rowIndex = rows.indexOf(targetRowInfo.data);
        if (rowIndex !== -1) rows.splice(rowIndex, 1);
      }
    }
    this._dataMap.delete(r);

    // Delete the row section from XML if no ROWs remain
    if (this.data.worksheet.sheetData[0].row?.length === 0) {
      delete this.data.worksheet.sheetData[0].row;
    }
  }
}
