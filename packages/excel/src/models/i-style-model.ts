import type { ExcelConditionalRuleStyle } from "../types";
import type { ExcelStyle } from "./shared/excel-style";
import type { IExcelModel } from "./excel-model";

/** xl/styles.{xml,bin} 파트 모델 계약. numFmt, font, fill, border, xf, dxf 관리. */
export interface IStyleModel extends IExcelModel {
  /** 스타일을 등록하고 styleId(문자열 핸들) 반환. 동일 스타일은 재사용. */
  add(style: ExcelStyle): string;
  /** 기존 styleId 를 clone 후 일부 속성만 덮어쓴 새 스타일 등록. */
  addWithClone(id: string, style: ExcelStyle): string;
  /** styleId 의 스타일 역조회. */
  get(id: string): ExcelStyle;
  getNumFmtCode(numFmtId: string): string | undefined;
  /** 조건부 서식 dxf 등록 후 dxfId 반환. */
  addDxf(style: ExcelConditionalRuleStyle): string;
  /** 워크북 전역 기본 스타일 (0번 슬롯) 설정. */
  setDefaultStyle(style: ExcelStyle): void;
}
