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
 * xl/worksheets/sheet*.xml 파일을 관리하는 클래스.
 * 셀 데이터, 병합, 열 너비, 행 높이 등을 처리한다.
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
    // ROW 없으면 무효
    const rowInfo = this._dataMap.get(addr.r);
    if (rowInfo == null) return;

    // CELL 없으면 무효
    const cellData = rowInfo.cellMap.get(addr.c);
    if (cellData == null) return;

    // CELL 삭제
    const cellsData = rowInfo.data.c!;
    const cellIndex = cellsData.indexOf(cellData);
    if (cellIndex !== -1) cellsData.splice(cellIndex, 1);
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
      const existingRange = ExcelUtils.parseRangeAddrCode(mergeCell.$.ref);

      if (
        newRange.s.r <= existingRange.e.r &&
        newRange.e.r >= existingRange.s.r &&
        newRange.s.c <= existingRange.e.c &&
        newRange.e.c >= existingRange.s.c
      ) {
        throw new Error(
          `병합 셀이 기존 병합 범위(${mergeCell.$.ref})와 겹칩니다: ${ExcelUtils.stringifyRangeAddr(newRange)}`,
        );
      }
    }

    mergeCells[0].mergeCell.push({ $: { ref: ExcelUtils.stringifyRangeAddr(newRange) } });
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
   * 특정 열의 너비를 설정한다.
   *
   * @internal
   * 외부에서는 ExcelCol.setWidth()를 사용한다.
   *
   * @param colIndex 열 인덱스 (1-based, 문자열)
   * @param width 설정할 너비
   */
  setColWidth(colIndex: string, width: string): void {
    const colIndexNumber = numParseInt(colIndex);
    if (colIndexNumber == null) {
      throw new Error(`잘못된 열 인덱스: ${colIndex}`);
    }

    const cols = this.data.worksheet.cols?.[0];

    // 대상 열을 포함하는 기존 범위 찾기
    const col = cols
      ? cols.col.single(
          (item) =>
            (numParseInt(item.$.min) ?? 0) <= colIndexNumber &&
            (numParseInt(item.$.max) ?? 0) >= colIndexNumber,
        )
      : undefined;

    if (col != null && cols != null) {
      if (col.$.min === col.$.max) {
        // 기존 범위가 단일 열인 경우: 해당 열의 속성만 변경
        col.$.bestFit = "1";
        col.$.customWidth = "1";
        col.$.width = width;
      } else {
        // 기존 범위가 여러 열인 경우: 범위를 분할하여 대상 열만 새 width 적용
        // 예: 기존 [1~5, width=10], 대상=3, 새 width=20
        //     → [1~2, width=10], [3, width=20], [4~5, width=10]
        const minNumber = numParseInt(col.$.min) ?? 0;
        const maxNumber = numParseInt(col.$.max) ?? 0;

        let insertIndex = cols.col.indexOf(col);

        // 앞쪽 범위 생성 (min ~ colIndex-1): 원본 속성 유지
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

        // 대상 열 생성 (colIndex): 새 width 적용
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

        // 뒤쪽 범위 생성 (colIndex+1 ~ max): 원본 속성 유지
        if (maxNumber > colIndexNumber) {
          cols.col.splice(insertIndex, 0, {
            $: {
              ...col.$,
              min: (colIndexNumber + 1).toString(),
              max: col.$.max,
            },
          });
        }

        // 원본 범위 삭제
        const colIndex2 = cols.col.indexOf(col);
        if (colIndex2 !== -1) cols.col.splice(colIndex2, 1);
      }
    } else {
      // 기존 범위 없음: 새 범위 생성
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
    // 출발지ROW 데이터 복제
    const sourceRowInfo = this._dataMap.get(sourceR);

    if (sourceRowInfo != null) {
      // rowData 복제
      const newRowData: ExcelRowData = objClone(sourceRowInfo.data);

      // ROW 주소 변경
      newRowData.$.r = ExcelUtils.stringifyRowAddr(targetR);

      // 각 CELL 주소 변경
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

    // 소스 행의 병합 셀 정보를 먼저 복사하여 저장
    const sourceMergeCells = this.getMergeCells()
      .filter((mc) => mc.s.r <= sourceR && mc.e.r >= sourceR)
      .map((mc) => ({ s: { ...mc.s }, e: { ...mc.e } }));

    // 타겟 행의 기존 병합 셀 제거
    for (const mergeCell of this.getMergeCells()) {
      if (mergeCell.s.r <= targetR && mergeCell.e.r >= targetR) {
        this.removeMergeCells(mergeCell.s, mergeCell.e);
      }
    }

    // 저장된 소스 병합 정보로 타겟에 복사
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

    // 순서 정렬 ("sheetData"기준 앞뒤로, 나머지는 원래위치대로)

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

    // ROW 정렬
    const rowsData = (result.sheetData[0].row = result.sheetData[0].row ?? []);
    rowsData.sort((a, b) => (numParseInt(a.$.r) ?? 0) - (numParseInt(b.$.r) ?? 0));

    // CELL 정렬
    for (const rowData of rowsData) {
      const cellsData = rowData.c;
      if (cellsData == null) continue;
      cellsData.sort(
        (a, b) => ExcelUtils.parseCellAddrCode(a.$.r).c - ExcelUtils.parseCellAddrCode(b.$.r).c,
      );
    }

    // Dimension 값 적용
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
    // ROW 없으면 만들기
    const rowInfo = this._getOrCreateRowInfo(addr.r);

    // CELL 없으면 만들기
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

    // sheet에 기록
    this.data.worksheet.sheetData[0].row = this.data.worksheet.sheetData[0].row ?? [];
    this.data.worksheet.sheetData[0].row.push(rowData);

    // cache에 기록
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

    // sheet에 기록
    targetRowInfo.data.c = targetRowInfo.data.c ?? [];
    targetRowInfo.data.c.push(cellData);

    // cache에 기록
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

    // ROW가 하나도 없으면 XML의 row부분 자체를 삭제
    if (this.data.worksheet.sheetData[0].row?.length === 0) {
      delete this.data.worksheet.sheetData[0].row;
    }
  }
}
