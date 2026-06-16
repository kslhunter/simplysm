import type { IExcelModel } from "./excel-model";

/** xl/workbook.{xml,bin} 파트 모델 계약. 워크시트 목록·관계 ID 관리. */
export interface IWorkbookModel extends IExcelModel {
  /** 등록된 워크시트 이름 목록. */
  readonly sheetNames: string[];
  /** 최대 워크시트 관계 ID (rId 숫자부). 없으면 undefined. */
  readonly lastWsRelId: number | undefined;
  /** 새 워크시트 엔트리 추가 (이름 sanitize·relId/sheetId 자동 증가). */
  addWorksheet(name: string): this;
  getWsRelIdByName(name: string): number | undefined;
  getWsRelIdByIndex(index: number): number | undefined;
  getWorksheetNameById(id: number): string | undefined;
  setWorksheetNameById(id: number, newName: string): void;
  /** bookViews 기본 골격 보장 (zoom·freeze 전 선행). */
  initializeView(): void;
}
