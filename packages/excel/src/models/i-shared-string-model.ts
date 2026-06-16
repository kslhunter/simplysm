import type { IExcelModel } from "./excel-model";

/** xl/sharedStrings.{xml,bin} 파트 모델 계약. 문자열 중복 제거 테이블. */
export interface ISharedStringModel extends IExcelModel {
  getIdByString(str: string): number | undefined;
  getStringById(id: number): string | undefined;
  /** 문자열 추가 후 인덱스 반환. */
  add(str: string): number;
}
