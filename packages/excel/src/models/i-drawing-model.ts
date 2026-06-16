import type { IExcelModel } from "./excel-model";

/**
 * xl/drawings/drawing*.xml 파트 모델 계약.
 * xlsb 도 drawing 은 OOXML XML 을 그대로 사용하므로 단일(xml) 구현으로 충분하다.
 */
export interface IDrawingModel extends IExcelModel {
  addPicture(opts: {
    from: { r: number; c: number; rOff?: number | string; cOff?: number | string };
    to: { r: number; c: number; rOff?: number | string; cOff?: number | string };
    blipRelId: string;
  }): void;
}
