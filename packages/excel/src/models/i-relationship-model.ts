import type { IExcelModel } from "./excel-model";

/** *.rels 파트 모델 계약. (xlsb 도 이 파트는 XML.) */
export interface IRelationshipModel extends IExcelModel {
  getTargetByRelId(rId: number): string | undefined;
  add(target: string, type: string): this;
  /** 관계 추가 후 rId 숫자부 반환. */
  addAndGetId(target: string, type: string): number;
  /** 지정 rId 위치에 삽입하고 이후 id 를 시프트. */
  insert(rId: number, target: string, type: string): this;
  /** 특정 Type 의 첫 관계를 찾아 relId(`rId..`), target 반환. addImage 의 drawing rel 탐색용. */
  findRelByType(type: string): { relId: string; target: string } | undefined;
}
