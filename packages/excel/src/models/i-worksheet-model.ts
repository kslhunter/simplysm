import type { ExcelAddressPoint, ExcelAddressRangePoint, ExcelCellType } from "../types";
import type { ICfRuleSpec } from "./shared/excel-cf-spec";
import type { IExcelModel } from "./excel-model";

/** xl/worksheets/sheet*.{xml,bin} 파트 모델 계약. 셀·병합·뷰·CF 관리. */
export interface IWorksheetModel extends IExcelModel {
  /** 데이터가 존재하는 셀 범위 (s: 좌상단, e: 우하단). */
  readonly range: ExcelAddressRangePoint;

  getCellStyleId(addr: ExcelAddressPoint): string | undefined;
  setCellStyleId(addr: ExcelAddressPoint, styleId: string | undefined): void;
  getCellType(addr: ExcelAddressPoint): ExcelCellType | undefined;
  setCellType(addr: ExcelAddressPoint, type: ExcelCellType | undefined): void;
  getCellVal(addr: ExcelAddressPoint): string | undefined;
  setCellVal(addr: ExcelAddressPoint, val: string | undefined): void;
  getCellFormula(addr: ExcelAddressPoint): string | undefined;
  setCellFormula(addr: ExcelAddressPoint, val: string | undefined): void;
  deleteCell(addr: ExcelAddressPoint): void;

  setMergeCells(startAddr: ExcelAddressPoint, endAddr: ExcelAddressPoint): void;
  getMergeCells(): ExcelAddressRangePoint[];
  shiftMergeCells(fromRow: number, delta: number): void;

  copyRow(sourceR: number, targetR: number, options?: { skipMerge?: boolean }): void;
  copyCell(sourceAddr: ExcelAddressPoint, targetAddr: ExcelAddressPoint): void;

  addConditionalFormatting(
    sqref: string,
    rules: { dxfId: string; cfRule: ICfRuleSpec }[],
  ): void;

  setTabColor(rgb: string): void;
  setZoom(percent: number): void;
  freezeAt(point: { r?: number; c?: number }): void;
  setAutoFilter(range: ExcelAddressRangePoint): void;
  setColWidth(colIndex: string, width: string): void;

  /** 워크시트에 drawing 파트 참조(rId) 연결. addImage 가 .data 직접 조작 대신 호출. */
  setDrawingRelId(relId: string): void;
}
