import type { IExcelModel } from "./excel-model";

/** [Content_Types].xml 파트 모델 계약. (xlsb 도 이 파트는 XML.) */
export interface IContentTypeModel extends IExcelModel {
  /** 파트별 ContentType override 추가. 중복 PartName 은 무시. */
  add(partName: string, contentType: string): this;
}
